# Backup Strategy — Sampada

## Data Storage
PostgreSQL database (self-hosted or managed).

## Automated Backups
- Configure pg_dump cron job: `0 2 * * * pg_dump -Fc sampada_production > /backups/sampada_production_$(date +\%Y\%m\%d).dump`
- Retention: 30 days (rotate via cron)

## Manual Export
```bash
pg_dump -Fc sampada_production > sampada_production_$(date +%Y%m%d).dump
```

## Restore
```bash
pg_restore -d sampada_production sampada_production_20260101.dump
```

## RTO / RPO
- **RTO**: < 2 hours
- **RPO**: < 24 hours
