import { useParams } from 'react-router-dom';
import MemorialPageDisplay from '../components/memorials/MemorialPageDisplay';

const ViewMemorial = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-lg mx-auto">
          <h2 className="text-2xl font-serif text-slate-800 mb-4">Memorial Not Found</h2>
          <p className="text-slate-600 mb-6">
            The memorial you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return <MemorialPageDisplay memorialId={id} />;
};

export default ViewMemorial;