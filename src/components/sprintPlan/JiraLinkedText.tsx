const ISSUE_KEY_RE = /(MLCSIXZERO-\d+)/g

interface JiraLinkedTextProps {
  text: string
  browseBase?: string
  className?: string
}

export default function JiraLinkedText({
  text,
  browseBase = 'https://harmony.lge.com:8443/issue/browse',
  className,
}: JiraLinkedTextProps) {
  const parts = text.split(ISSUE_KEY_RE)

  return (
    <span className={className}>
      {parts.map((part, index) =>
        /^MLCSIXZERO-\d+$/.test(part) ? (
          <a
            key={`${part}-${index}`}
            href={`${browseBase}/${part}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg-red font-mono font-semibold hover:underline"
          >
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </span>
  )
}
