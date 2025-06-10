#!/bin/bash
# Script to update Taskmaster progress for Langfuse integration

# Get current tasks
echo "=== Current Tasks ==="
npx -y --package=task-master-ai task-master-ai get_tasks

# Update specific subtask
# Usage: ./update-progress.sh <task_id> <subtask_id> <status>
if [ $# -eq 3 ]; then
    echo "=== Updating Subtask ==="
    npx -y --package=task-master-ai task-master-ai update_subtask $1 $2 $3
fi

# Get next task
echo "=== Next Task ==="
npx -y --package=task-master-ai task-master-ai next_task