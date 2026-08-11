import { FileText } from 'lucide-react';

function isImageAttachment(productReference) {
  return String(productReference?.mimeType || '').startsWith('image/');
}

function ProductReferenceAttachment({
  productReference,
  emptyFallback = '-',
  className = '',
}) {
  if (!productReference?.key) {
    return emptyFallback;
  }

  const isImage = isImageAttachment(productReference);
  const label =
    productReference.originalName ||
    (isImage ? 'Product reference image' : 'Product reference PDF');
  const viewLabel = isImage ? 'View Image' : 'View PDF';

  return (
    <div className={`flex min-w-[190px] items-center gap-3 ${className}`}>
      {isImage && productReference.url ? (
        <img
          src={productReference.url}
          alt={label}
          className="h-12 w-12 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-background">
          <FileText className="h-5 w-5 text-body" />
        </div>
      )}

      <div className="min-w-0">
        {!isImage ? (
          <p className="max-w-[220px] truncate text-sm font-medium text-heading">
            {label}
          </p>
        ) : null}

        {productReference.url ? (
          <a
            href={productReference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-primary hover:underline"
          >
            {viewLabel}
          </a>
        ) : (
          <span className="text-sm text-body">{label}</span>
        )}
      </div>
    </div>
  );
}

export default ProductReferenceAttachment;
