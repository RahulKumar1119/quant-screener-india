#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Build and deploy the Quant Screener India Lambda package
#
# Creates a lightweight Lambda deployment zip (<250MB) containing:
#   - FastAPI application + Mangum adapter
#   - NSE data fetching (jugaad-data, httpx)
#   - DynamoDB caching layer
#   - ML model wrappers (boto3 → SageMaker endpoints)
#   - No heavy ML frameworks (TensorFlow, PyTorch, XGBoost run on SageMaker)
#
# Usage:
#   ./deploy.sh                     # Build zip only
#   ./deploy.sh --deploy            # Build and deploy via SAM
#   ./deploy.sh --deploy --guided   # Build and deploy with guided SAM prompts
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/.build"
PACKAGE_DIR="${BUILD_DIR}/package"
ZIP_FILE="${BUILD_DIR}/lambda-package.zip"
STACK_NAME="quant-screener-india-backend"
S3_BUCKET="${DEPLOY_S3_BUCKET:-quant-screener-india-deploy}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "========================================="
echo " Quant Screener India — Lambda Packager"
echo "========================================="

# Clean previous build
echo "[1/5] Cleaning previous build..."
rm -rf "${BUILD_DIR}"
mkdir -p "${PACKAGE_DIR}"

# Install production dependencies (lightweight, no ML frameworks)
echo "[2/5] Installing Python dependencies..."
pip install \
    --target "${PACKAGE_DIR}" \
    --platform manylinux2014_x86_64 \
    --implementation cp \
    --python-version 3.11 \
    --only-binary=:all: \
    --upgrade \
    -r "${SCRIPT_DIR}/requirements.txt" \
    2>&1 | tail -5

# Copy application source files
echo "[3/5] Copying application source..."
cp "${SCRIPT_DIR}/app.py" "${PACKAGE_DIR}/"
cp "${SCRIPT_DIR}/nse_client.py" "${PACKAGE_DIR}/"
cp "${SCRIPT_DIR}/cache.py" "${PACKAGE_DIR}/"
cp "${SCRIPT_DIR}/rate_limiter.py" "${PACKAGE_DIR}/"
cp "${SCRIPT_DIR}/schemas.py" "${PACKAGE_DIR}/"
cp -r "${SCRIPT_DIR}/ml_models" "${PACKAGE_DIR}/ml_models"

# Remove unnecessary files to minimize package size
echo "[4/5] Optimizing package size..."
find "${PACKAGE_DIR}" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "${PACKAGE_DIR}" -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true
find "${PACKAGE_DIR}" -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
find "${PACKAGE_DIR}" -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
find "${PACKAGE_DIR}" -name "*.pyc" -delete 2>/dev/null || true
find "${PACKAGE_DIR}" -name "*.pyo" -delete 2>/dev/null || true

# Create deployment zip
echo "[5/5] Creating deployment zip..."
cd "${PACKAGE_DIR}"
zip -r "${ZIP_FILE}" . -x "*.pyc" -q
cd "${SCRIPT_DIR}"

# Report package size
PACKAGE_SIZE=$(du -sh "${ZIP_FILE}" | cut -f1)
PACKAGE_SIZE_MB=$(du -sm "${ZIP_FILE}" | cut -f1)
echo ""
echo "========================================="
echo " Build complete!"
echo " Package: ${ZIP_FILE}"
echo " Size: ${PACKAGE_SIZE} (${PACKAGE_SIZE_MB}MB)"
echo "========================================="

# Verify package stays under Lambda limit
if [ "${PACKAGE_SIZE_MB}" -gt 250 ]; then
    echo "ERROR: Package exceeds Lambda 250MB limit!"
    echo "Current size: ${PACKAGE_SIZE_MB}MB"
    exit 1
fi

echo "Package is within Lambda 250MB limit."

# Deploy if --deploy flag is passed
if [[ "${1:-}" == "--deploy" ]] || [[ "${2:-}" == "--deploy" ]]; then
    echo ""
    echo "Deploying to AWS Lambda via SAM..."

    SAM_ARGS=""
    if [[ "${1:-}" == "--guided" ]] || [[ "${2:-}" == "--guided" ]]; then
        SAM_ARGS="--guided"
    fi

    sam deploy \
        --template-file "${SCRIPT_DIR}/template.yaml" \
        --stack-name "${STACK_NAME}" \
        --s3-bucket "${S3_BUCKET}" \
        --region "${AWS_REGION}" \
        --capabilities CAPABILITY_IAM \
        --no-confirm-changeset \
        --parameter-overrides \
            "XGBoostEndpoint=quant-screener-xgboost" \
            "LSTMEndpoint=quant-screener-lstm" \
            "TFTEndpoint=quant-screener-tft" \
        ${SAM_ARGS}

    echo ""
    echo "Deployment complete!"
    echo "Stack: ${STACK_NAME}"
    echo "Region: ${AWS_REGION}"
else
    echo ""
    echo "To deploy, run: ./deploy.sh --deploy"
    echo "For guided deploy: ./deploy.sh --deploy --guided"
fi
