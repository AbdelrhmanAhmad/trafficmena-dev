import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const NotFound = () => {
  const { t } = useTranslation('errors');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">{t('notFoundDesc')}</p>
        <Link to="/" className="text-blue-500 underline hover:text-blue-700">
          {t('returnHome')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
