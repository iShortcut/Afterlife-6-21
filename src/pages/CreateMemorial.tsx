import { useNavigate } from 'react-router-dom';
import MemorialCreateForm from '../components/memorials/MemorialCreateForm';

const CreateMemorial = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-serif text-slate-800 mb-4">
            Create a Memorial
          </h1>
          
          <p className="text-slate-600 mb-8">
            Fill in the details below to create a tribute page for your loved one.
          </p>
          
          <MemorialCreateForm />
        </div>
      </div>
    </div>
  );
};

export default CreateMemorial;