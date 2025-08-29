import { WorkflowBuilder } from '@/components/workflows/WorkflowBuilder';

export default function WorkflowsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Workflow Builder</h1>
      <WorkflowBuilder />
    </div>
  );
}
