export default function AppLogo({ size = 96, className = "" }) {
  return (
    <div
      className={`rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: "#147a2e",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size * 0.6, height: size * 0.6 }}
      >
        <path
          d="M5 12.5L10 17.5L19 7"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}