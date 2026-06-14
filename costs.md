# Quant Screener India — AWS Cost Estimate

## Architecture Summary

```
Frontend (Amplify) → API Gateway → Lambda (FastAPI) → SageMaker Serverless (ML)
                                                     → AWS Bedrock (Gemma LLM)
                                                     → DynamoDB (Cache)
                                                     → NSE India APIs (Data)
```

---

## Low Traffic (~1,000 requests/day)

| Service | Usage Estimate | Monthly Cost (USD) |
|---------|---------------|-------------------|
| AWS Amplify | Static SPA hosting, ~1GB transfer | $0.50–$1.00 |
| API Gateway (REST) | ~30K requests/month | $0.10 |
| Lambda (512MB, ~2s avg) | ~30K invocations/month | $0.50–$1.00 |
| SageMaker Serverless (3 endpoints, 2048MB) | ~30K inferences/month | $15–$25 |
| AWS Bedrock (Gemma 3 4B IT) | ~1K summaries/day, ~500 tokens each | $3–$5 |
| DynamoDB (On-Demand) | ~30K reads + writes/day | $1–$2 |
| S3 (model artifacts) | ~500MB stored | $0.01 |
| **Total** | | **$20–$35/mo** |

---

## Medium Traffic (~10,000 requests/day)

| Service | Usage Estimate | Monthly Cost (USD) |
|---------|---------------|-------------------|
| AWS Amplify | ~10GB transfer | $2–$3 |
| API Gateway (REST) | ~300K requests/month | $1.05 |
| Lambda (512MB, ~2s avg) | ~300K invocations/month | $3–$5 |
| SageMaker Serverless (3 endpoints, 2048MB) | ~300K inferences/month | $80–$120 |
| AWS Bedrock (Gemma 3 4B IT) | ~10K summaries/day | $25–$40 |
| DynamoDB (On-Demand) | ~300K reads + writes/day | $5–$8 |
| S3 (model artifacts) | ~500MB stored | $0.01 |
| **Total** | | **$120–$180/mo** |

---

## High Traffic (~50,000 requests/day)

| Service | Usage Estimate | Monthly Cost (USD) |
|---------|---------------|-------------------|
| AWS Amplify | ~50GB transfer | $8–$10 |
| API Gateway (REST) | ~1.5M requests/month | $5.25 |
| Lambda (512MB, ~2s avg) | ~1.5M invocations/month | $12–$18 |
| SageMaker Serverless (3 endpoints, 2048MB) | ~1.5M inferences/month | $400–$600 |
| AWS Bedrock (Gemma 3 4B IT) | ~50K summaries/day | $120–$180 |
| DynamoDB (On-Demand) | ~1.5M reads + writes/day | $20–$30 |
| S3 (model artifacts) | ~500MB stored | $0.01 |
| **Total** | | **$570–$850/mo** |

---

## Cost Breakdown by Service

### AWS Amplify (Frontend Hosting)

- Hosting: $0.01/GB served
- Build: $0.01/build minute (one-time per deploy)
- No compute cost — purely static file serving

### API Gateway

- REST API: $3.50 per million requests
- No idle cost

### Lambda

- Requests: $0.20 per 1M requests
- Duration: $0.0000083333/GB-second (512MB = $0.0000041667/s)
- Free tier: 1M requests + 400K GB-seconds/month (first 12 months)

### SageMaker Serverless Inference

- Cost: $0.0001/second per 2048MB endpoint
- 3 endpoints × average ~0.5s inference = $0.00015 per full request
- **Scales to zero** when idle (no cost during off-hours)
- Cold start: ~30-60s latency (no charge for cold start time)

### AWS Bedrock (Gemma 3 4B IT)

- Input tokens: ~$0.0003 per 1K tokens
- Output tokens: ~$0.001 per 1K tokens
- Per summary (~200 input + 300 output tokens): ~$0.0004
- No idle cost — pay per invocation only

### DynamoDB (On-Demand)

- Read: $0.25 per million read request units
- Write: $1.25 per million write request units
- Storage: $0.25/GB/month
- Free tier: 25 RCU/WCU + 25GB (first 12 months)

### S3 (Model Artifacts)

- Storage: $0.023/GB/month
- Negligible for <1GB of model files

---

## Free Tier Savings (First 12 Months)

| Service | Free Tier Allowance | Estimated Savings |
|---------|-------------------|-------------------|
| Lambda | 1M requests + 400K GB-s/month | ~$5/mo |
| DynamoDB | 25 WCU + 25 RCU + 25GB | ~$2/mo |
| API Gateway | 1M REST calls/month | ~$3.50/mo |
| S3 | 5GB storage + 20K GETs | ~$0.10/mo |
| **Total savings** | | **~$10/mo** |

With free tier, the low-traffic scenario drops to approximately **$10–$25/month**.

---

## Training Costs (Local, One-Time)

Training runs on your local machine — no AWS cost.

| Model | Estimated Time (CPU) | Estimated Time (GPU) |
|-------|---------------------|---------------------|
| XGBoost | 2–5 minutes | N/A (CPU-optimized) |
| TFT (PyTorch) | 20–45 minutes | 5–10 minutes |

Retraining frequency: Weekly or monthly depending on model staleness tolerance.

---

## Cost Optimization Strategies

### 1. Caching (Already Implemented)

Current TTL strategy prevents redundant calls:

| Cache Tier | TTL | Savings Impact |
|-----------|-----|----------------|
| Live quotes | 5 min | Reduces SageMaker calls by ~80% during market hours |
| Historical OHLC | 24 hr | Eliminates repeat NSE fetches |
| Financial results | 24 hr | Eliminates repeat NSE fetches |
| ML predictions | 1 hr | Reduces SageMaker calls significantly |
| Nifty 500 list | 24 hr | Single fetch per day |

**Estimated cache hit rate**: 70-85% → reduces effective SageMaker cost by 3-5x.

### 2. SageMaker Alternatives at Scale

| Option | When to Switch | Cost Savings |
|--------|---------------|--------------|
| Serverless (current) | <50K inferences/day | Best for low/variable traffic |
| Real-Time + Spot Instances | >50K inferences/day | ~70% savings over on-demand |
| Real-Time + Savings Plans | Predictable high traffic | ~60% savings with commitment |
| Batch Transform | Non-real-time scoring | ~80% savings (offline only) |

### 3. Bedrock Cost Reduction

- Cache Gemma summaries for 24 hours (financials don't change intraday)
- Skip summary generation for tickers viewed in last 24 hours
- Reduce `maxOutputTokens` from 300 to 200 for shorter summaries
- Potential savings: 50-70% on Bedrock costs

### 4. Off-Market Hours Optimization

NSE trades 9:15 AM – 3:30 PM IST (Mon-Fri). During off-hours:
- Live quote cache TTL can increase to 24hr
- SageMaker endpoints naturally scale to zero
- No NSE rate limiting concerns

### 5. DynamoDB Reserved Capacity

At medium/high traffic, switch from On-Demand to Provisioned:
- Provisioned: ~$0.00065/RCU-hour + $0.00065/WCU-hour
- With reserved capacity (1-year): ~40% savings

---

## Monthly Cost Comparison (With vs Without Optimization)

| Traffic Level | Without Optimization | With Optimization | Savings |
|--------------|---------------------|-------------------|---------|
| Low (1K/day) | $20–$35 | $10–$20 | 40-50% |
| Medium (10K/day) | $120–$180 | $60–$90 | 50% |
| High (50K/day) | $570–$850 | $250–$400 | 50-55% |

---

## Pricing References (June 2026)

- [SageMaker Serverless Pricing](https://aws.amazon.com/sagemaker/pricing/)
- [Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [DynamoDB Pricing](https://aws.amazon.com/dynamodb/pricing/)
- [API Gateway Pricing](https://aws.amazon.com/api-gateway/pricing/)
- [Amplify Pricing](https://aws.amazon.com/amplify/pricing/)

---

## Summary

| Scenario | Monthly Cost |
|----------|-------------|
| Development / Personal use | $10–$25 (with free tier) |
| Low traffic production | $20–$35 |
| Medium traffic production | $120–$180 |
| High traffic production | $570–$850 |
| High traffic + optimized | $250–$400 |

The serverless architecture ensures **zero cost when idle** and scales proportionally with usage. The biggest cost driver is SageMaker Serverless inference — if costs grow, migrate to Real-Time endpoints with spot instances.
