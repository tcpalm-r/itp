export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
      <p className="text-gray-600 mb-4">You don&apos;t have permission to access this application.</p>
      <a href="/" className="text-blue-600 hover:underline">Go to Home</a>
    </div>
  );
}
