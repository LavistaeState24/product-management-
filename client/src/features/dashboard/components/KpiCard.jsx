import Badge from '@/components/ui/Badge';

function KpiCard({ title, value, change, trend = 'info' }) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-body">{title}</p>
          <p className="mt-4 text-3xl font-bold text-heading">{value}</p>
        </div>
        <Badge variant={trend}>{change}</Badge>
      </div>
    </div>
  );
}

export default KpiCard;
