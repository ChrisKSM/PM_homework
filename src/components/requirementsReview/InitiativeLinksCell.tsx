interface LinkRow {
  key: string
  url: string
  role?: string
}

export default function InitiativeLinksCell({
  initiative,
  initiativeUrl,
  initiativeLinks,
}: {
  initiative?: string
  initiativeUrl?: string
  initiativeLinks?: LinkRow[]
}) {
  const links = initiativeLinks?.length
    ? initiativeLinks
    : initiativeUrl
      ? [{ key: initiative || initiativeUrl, url: initiativeUrl }]
      : []

  if (!links.length) {
    return <>{initiative && initiative !== '—' ? initiative : '—'}</>
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      {links.map((l) => (
        <a
          key={`${l.key}-${l.url}`}
          href={l.url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline font-mono leading-tight"
          title={l.role ? `Polarion: ${l.role}` : undefined}
        >
          {l.key}
        </a>
      ))}
    </span>
  )
}
