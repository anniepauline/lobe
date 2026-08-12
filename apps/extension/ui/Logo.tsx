export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span
      className="logo"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24">
        <path d="M6 3.5A2.5 2.5 0 0 0 3.5 6v15l8.5-5.4 8.5 5.4V6A2.5 2.5 0 0 0 18 3.5H6Zm0 2h12a.5.5 0 0 1 .5.5v11.35L12 13.22l-6.5 4.13V6a.5.5 0 0 1 .5-.5Z" />
      </svg>
    </span>
  );
}
