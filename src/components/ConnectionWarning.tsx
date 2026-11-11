export function ConnectionWarning() {
  return (
    <div
      className="mx-auto mb-4 w-full max-w-3xl rounded-2xl border border-danger bg-surface px-4 py-3"
      role="alert"
    >
      <p className="m-0 text-sm">
        <b className="text-danger">Can’t reach OnYou.</b> Check your internet
        connection. If it stays down for about 30 seconds, this session ends
        without rewards.
      </p>
    </div>
  );
}
