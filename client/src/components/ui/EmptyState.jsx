import Button from '@/components/ui/Button';

function EmptyState({ title, description, actionLabel, onAction, icon: Icon }) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      {Icon ? (
        <div className="rounded-3xl bg-primary-tint p-4 text-primary">
          <Icon className="h-8 w-8" />
        </div>
      ) : null}
      <div>
        <h3 className="text-lg font-semibold text-heading">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-body">{description}</p>
      </div>
      {actionLabel ? (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default EmptyState;
