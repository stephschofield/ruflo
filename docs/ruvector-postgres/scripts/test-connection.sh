#!/bin/bash
# Test connection to RuVector PostgreSQL
#
# Tests:
# - Basic connection
# - RuVector extension
# - Schema and tables
# - HNSW indices
# - Local embedding generation
# - Sample data

set -e

HOST="${PGHOST:-localhost}"
PORT="${PGPORT:-5432}"
DATABASE="${PGDATABASE:-claude_flow}"
USER="${PGUSER:-claude}"
PASSWORD="${PGPASSWORD:-claude-flow-test}"

echo "============================================"
echo "RuVector PostgreSQL Connection Test"
echo "============================================"
echo ""
echo "Host: $HOST:$PORT"
echo "Database: $DATABASE"
echo "User: $USER"
echo ""

# 1. Test basic connection
echo "1. Testing connection..."
PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Connection successful"
else
    echo "   ❌ Connection failed"
    exit 1
fi

# 2. Check PostgreSQL version
echo ""
echo "2. PostgreSQL version:"
PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -t -c "SELECT version();" | head -1 | xargs

# 3. Check RuVector extension
echo ""
echo "3. Checking RuVector extension..."
RESULT=$(PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -t -c \
    "SELECT extversion FROM pg_extension WHERE extname = 'ruvector';" 2>/dev/null | tr -d ' ')
if [ -n "$RESULT" ]; then
    echo "   ✅ RuVector version: $RESULT"
else
    # Fallback to check for vector extension (pgvector compatibility)
    RESULT=$(PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -t -c \
        "SELECT extversion FROM pg_extension WHERE extname = 'vector';" 2>/dev/null | tr -d ' ')
    if [ -n "$RESULT" ]; then
        echo "   ⚠️  pgvector found (version: $RESULT) - RuVector not installed"
        echo "      Consider using ruvector/postgres:latest for full features"
    else
        echo "   ❌ No vector extension found"
    fi
fi

# 4. Check schema
echo ""
echo "4. Checking claude_flow schema..."
RESULT=$(PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -t -c \
    "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = 'claude_flow';" | tr -d ' ')
if [ "$RESULT" = "1" ]; then
    echo "   ✅ Schema exists"
else
    echo "   ❌ Schema not found"
fi

# 5. Check tables
echo ""
echo "5. Checking tables..."
TABLES=$(PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -t -c \
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'claude_flow' ORDER BY table_name;" | tr -d ' ' | grep -v "^$")
for table in $TABLES; do
    echo "   ✅ Table: $table"
done

# 6. Check HNSW indices
echo ""
echo "6. Checking HNSW indices..."
INDICES=$(PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -t -c \
    "SELECT indexname FROM pg_indexes WHERE schemaname = 'claude_flow' AND (indexdef LIKE '%hnsw%' OR indexdef LIKE '%ruvector_hnsw%');" | tr -d ' ' | grep -v "^$")
if [ -n "$INDICES" ]; then
    for idx in $INDICES; do
        echo "   ✅ Index: $idx"
    done
else
    echo "   ⚠️  No HNSW indices found"
fi

# 7. Test local embedding generation
echo ""
echo "7. Testing local embedding generation..."
RESULT=$(PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -t -c \
    "SELECT CASE WHEN ruvector.fastembed('test', 'all-MiniLM-L6-v2') IS NOT NULL THEN 'success' ELSE 'failed' END;" 2>/dev/null | tr -d ' ')
if [ "$RESULT" = "success" ]; then
    echo "   ✅ Local embedding generation works"
else
    # Try with basic vector function as fallback
    echo "   ⚠️  ruvector.fastembed not available"
    echo "      (May need full RuVector extension)"
fi

# 8. Count sample data
echo ""
echo "8. Sample data counts:"

COUNT=$(PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -t -c \
    "SELECT COUNT(*) FROM claude_flow.embeddings;" 2>/dev/null | tr -d ' ')
echo "   📊 Embeddings: ${COUNT:-0} rows"

COUNT=$(PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -t -c \
    "SELECT COUNT(*) FROM claude_flow.patterns;" 2>/dev/null | tr -d ' ')
echo "   📊 Patterns: ${COUNT:-0} rows"

COUNT=$(PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -t -c \
    "SELECT COUNT(*) FROM claude_flow.agents;" 2>/dev/null | tr -d ' ')
echo "   📊 Agents: ${COUNT:-0} rows"

# 9. Check RuVector-specific features
echo ""
echo "9. RuVector feature availability:"

# Check for attention functions
PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -t -c \
    "SELECT ruvector.softmax_attention(NULL::ruvector.vector(384), NULL::ruvector.vector(384), 1.0);" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Attention mechanisms"
else
    echo "   ⚠️  Attention mechanisms not available"
fi

# Check for hyperbolic functions
PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -t -c \
    "SELECT ruvector.exp_map_poincare(NULL::ruvector.vector(384), -1.0);" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Hyperbolic embeddings"
else
    echo "   ⚠️  Hyperbolic embeddings not available"
fi

# Check for GNN functions
PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -t -c \
    "SELECT ruvector.gnn_aggregate(NULL::ruvector.vector(384)[], 'mean');" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ GNN operations"
else
    echo "   ⚠️  GNN operations not available"
fi

# Check for self-learning
PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U $USER -d $DATABASE -t -c \
    "SELECT ruvector.learn_optimize('claude_flow.embeddings', 'embedding');" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Self-learning optimization"
else
    echo "   ⚠️  Self-learning not available"
fi

echo ""
echo "============================================"
echo "✅ Connection test complete!"
echo "============================================"
echo ""
echo "Connection string:"
echo "  postgresql://$USER:****@$HOST:$PORT/$DATABASE"
echo ""
echo "To run example queries:"
echo "  psql postgresql://$USER@$HOST:$PORT/$DATABASE -f examples/basic-queries.sql"
echo ""
