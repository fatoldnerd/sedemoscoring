const ErrorMessage = ({ message, type = 'error' }) => {
  const typeClasses = {
    error: 'bg-red-50 border-red-200 text-red-600',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    info: 'bg-blue-50 border-blue-200 text-blue-600',
    success: 'bg-green-50 border-green-200 text-green-600',
  };

  if (!message) return null;

  return (
    <div className={`${typeClasses[type]} border px-4 py-3 rounded-md`}>
      {message}
    </div>
  );
};

export default ErrorMessage;
