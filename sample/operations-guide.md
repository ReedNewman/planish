# DataVault Operations Guide

**Version 1.0** | System Administration Reference

---

## Infrastructure Overview

DataVault runs on a distributed architecture with multiple service tiers. This guide covers deployment, monitoring, scaling, and incident response procedures.

### Architecture Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| API Gateway | Nginx / Envoy | Request routing, TLS termination, rate limiting |
| Application Tier | Node.js / Kotlin | Business logic, authentication, document processing |
| Search Engine | Elasticsearch 8.x | Full-text search, aggregations, relevance scoring |
| Primary Database | PostgreSQL 16 | Metadata, user accounts, audit logs |
| Object Storage | S3-compatible | Document binary storage |
| Cache | Redis 7.x | Session tokens, rate limit counters, query cache |
| Message Queue | RabbitMQ | Async processing, webhook delivery, ETL pipelines |

### Service Dependencies

> **Critical Path:** API Gateway -> Application Tier -> Primary Database. If any of these three components are down, the platform is unavailable. Search and Object Storage can degrade gracefully.

## Deployment

### Prerequisites

Ensure the following tools are installed on the deployment host:

```bash
# Verify required tools
docker --version        # >= 24.0
docker compose version  # >= 2.20
kubectl version         # >= 1.28
helm version            # >= 3.13
```

### Environment Configuration

Each environment uses a dedicated configuration file:

| Environment | Config File | Database | Replicas |
|-------------|------------|----------|----------|
| Development | `config.dev.yaml` | Local PostgreSQL | 1 |
| Staging | `config.staging.yaml` | RDS (Multi-AZ) | 2 |
| Production | `config.prod.yaml` | RDS (Multi-AZ + Read Replicas) | 4+ |

### Deploy Process

1. Pull the latest release artifacts
2. Run database migrations
3. Deploy application containers
4. Verify health checks
5. Update DNS / load balancer targets

```bash
# Standard deployment
./deploy.sh --env production --version 2.4.1

# Rolling update (zero downtime)
kubectl rollout restart deployment/datavault-api -n production
kubectl rollout status deployment/datavault-api -n production
```

## Monitoring

### Health Check Endpoints

| Endpoint | Interval | Timeout | Failure Threshold |
|----------|----------|---------|-------------------|
| `/health` | 10s | 3s | 3 consecutive |
| `/health/ready` | 15s | 5s | 2 consecutive |
| `/health/db` | 30s | 10s | 1 failure |
| `/health/search` | 30s | 10s | 2 consecutive |

### Key Metrics

Monitor these metrics for operational awareness:

- **Request latency** (p50, p95, p99) — Target: p99 < 500ms
- **Error rate** — Target: < 0.1% of total requests
- **Database connection pool** — Alert if utilization > 80%
- **Queue depth** — Alert if messages pending > 10,000
- **Disk usage** — Alert if any volume > 85%
- **Certificate expiry** — Alert 30 days before expiration

### Alert Escalation Matrix

| Severity | Response Time | Notification | Example |
|----------|--------------|--------------|---------|
| P1 (Critical) | 15 min | PagerDuty + Phone | Full outage, data loss risk |
| P2 (High) | 1 hour | PagerDuty + Slack | Partial degradation, elevated errors |
| P3 (Medium) | 4 hours | Slack only | Non-critical service down, slow queries |
| P4 (Low) | Next business day | Email | Cosmetic issues, minor warnings |

## Scaling

### Horizontal Scaling

The application tier scales horizontally behind the load balancer:

```bash
# Scale API replicas
kubectl scale deployment/datavault-api --replicas=8 -n production

# Auto-scaling configuration
kubectl autoscale deployment/datavault-api \
  --min=4 --max=16 \
  --cpu-percent=70 \
  -n production
```

### Database Scaling

PostgreSQL scaling follows this progression:

1. **Vertical scaling** — Increase instance size (up to `db.r6g.16xlarge`)
2. **Read replicas** — Add up to 5 read replicas for read-heavy workloads
3. **Connection pooling** — Use PgBouncer to manage connection limits
4. **Partitioning** — Partition large tables by date range

> **Warning:** Never scale down database storage. EBS volumes cannot be shrunk after expansion. Plan storage capacity carefully.

## Backup and Recovery

### Backup Schedule

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Database snapshot | Every 6 hours | 30 days | S3 (cross-region) |
| WAL archiving | Continuous | 7 days | S3 |
| Object storage | Real-time replication | Indefinite | S3 (cross-region) |
| Configuration | On every deploy | 90 days | Git + S3 |

### Recovery Procedures

##### Point-in-Time Recovery

```bash
# Restore database to specific timestamp
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier datavault-prod \
  --target-db-instance-identifier datavault-prod-restore \
  --restore-time "2026-04-10T14:30:00Z"
```

##### Full Environment Recovery

In the event of a complete environment loss:

1. Provision new infrastructure via Terraform
2. Restore the most recent database snapshot
3. Apply WAL logs to reach point-in-time consistency
4. Verify object storage replication is current
5. Deploy application containers
6. Run integration test suite
7. Switch DNS to new environment

## Incident Response

### Runbook: High Error Rate

When the error rate exceeds 1%:

1. Check application logs for common error patterns
   - Authentication failures: likely an IdP issue
   - Database timeouts: check connection pool and slow queries
   - 5xx errors: check application health and recent deployments
2. Check recent deployments — was anything deployed in the last hour?
3. Check dependent services (database, cache, search engine)
4. If a bad deployment is suspected, initiate rollback:

```bash
# Rollback to previous version
kubectl rollout undo deployment/datavault-api -n production

# Verify rollback
kubectl rollout status deployment/datavault-api -n production
```

### Runbook: Database Connection Exhaustion

When active connections approach the maximum:

1. Identify long-running queries:

```bash
psql -h db-host -U admin -d datavault -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration,
         query, state
  FROM pg_stat_activity
  WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  ORDER BY duration DESC;
"
```

2. Terminate idle connections if necessary
3. Check for connection leaks in application logs
4. Scale up PgBouncer pool size if the load is legitimate
