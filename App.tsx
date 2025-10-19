import React, { useState, useCallback } from 'react';
import { generateStory } from './services/geminiService';
import Loader from './components/Loader';
import Pagination from './components/Pagination';
import type { StoryPage } from './types';

const FeatherIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M20.352,3.8c-0.889-0.889-2.333-0.889-3.222,0L5.33,15.6c-0.54,0.54-0.801,1.259-0.745,1.983c0.047,0.617,0.36,1.191,0.852,1.684c0.485,0.485,1.059,0.798,1.676,0.844c0.725,0.056,1.444-0.205,1.984-0.745L20.352,7.022C21.24,6.133,21.24,4.689,20.352,3.8z M8.878,18.828c-0.292-0.292-0.418-0.699-0.366-1.091c0.042-0.32,0.245-0.609,0.536-0.834L17.3,8.749l1.844,1.844l-8.248,8.248C10.672,19.011,10.383,19.214,10.063,19.256C9.671,19.308,9.27,19.182,8.978,18.89L8.878,18.828z"/>
        <path d="M4.648,15.752c-0.334,0.334-0.87,0.334-1.204,0c-0.334-0.334-0.334-0.87,0-1.204l1.834-1.834c0.334-0.334,0.87-0.334,1.204,0c0.334,0.334,0.334,0.87,0,1.204L4.648,15.752z"/>
        <path d="M2.75,21.25c-0.229,0-0.459-0.088-0.636-0.264c-0.352-0.352-0.352-0.921,0-1.273l1.834-1.834c0.352-0.352,0.921-0.352,1.273,0c0.352,0.352,0.352,0.921,0,1.273l-1.834,1.834C3.209,21.162,2.979,21.25,2.75,21.25z"/>
    </svg>
);


function App() {
  const [prompt, setPrompt] = useState('');
  const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerateStory = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a story idea.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setStoryPages([]);
    setCurrentPage(1);

    try {
      const pages = await generateStory(prompt, setLoadingMessage);
      setStoryPages(pages);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [prompt]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader message={loadingMessage} />
        </div>
      );
    }

    if (error) {
      return <div className="text-center text-red-400 p-4">{error}</div>;
    }

    if (storyPages.length > 0) {
      const currentPageData = storyPages[currentPage - 1];
      return (
        <div className="bg-gray-800 shadow-2xl rounded-lg flex flex-col h-full overflow-hidden">
            <div className="w-full h-1/2 md:h-2/5 flex-shrink-0 bg-gray-900">
                <img
                    src={currentPageData.imageUrl}
                    alt={`Illustration for page ${currentPage}`}
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="p-8 md:p-12 flex-grow overflow-y-auto leading-relaxed text-gray-300 font-serif text-lg">
                {currentPageData.text.split('\n\n').map((paragraph, index) => {
                    if (paragraph.startsWith('## ')) {
                        return <h2 key={index} className="text-3xl font-bold text-indigo-300 mt-2 mb-4">{paragraph.substring(3)}</h2>
                    }
                    return <p key={index} className="mb-4">{paragraph}</p>
                })}
            </div>
            <div className="bg-gray-900 border-t border-gray-700 mt-auto">
                <Pagination
                    currentPage={currentPage}
                    totalPages={storyPages.length}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
      );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <FeatherIcon className="w-24 h-24 text-indigo-400 mb-4"/>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-100 mb-2">AI Story Weaver</h1>
            <p className="text-lg text-gray-400 max-w-2xl">
                Provide a single sentence or a detailed paragraph, and watch the AI weave a complete, multi-page story from your idea, complete with illustrations.
            </p>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col lg:flex-row p-4 gap-4">
      {/* --- Left Panel (Controls) --- */}
      <aside className="w-full lg:w-1/3 xl:w-1/4 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 flex flex-col border border-gray-700">
        <h2 className="text-2xl font-bold text-indigo-400 mb-4 border-b border-gray-700 pb-2 flex items-center">
            <FeatherIcon className="w-6 h-6 mr-2" />
            Your Story Idea
        </h2>
        <textarea
          className="w-full h-48 p-3 bg-gray-900 border border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-gray-200"
          placeholder="e.g., A detective in a futuristic city discovers a secret about the rain..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
        />
        <button
          onClick={handleGenerateStory}
          disabled={isLoading}
          className="w-full mt-4 py-3 px-4 bg-indigo-600 text-white font-semibold rounded-md shadow-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
        >
          {isLoading ? 'Weaving...' : 'Write My Story'}
        </button>
        {storyPages.length > 0 && !isLoading && (
          <button
            onClick={() => { setStoryPages([]); setPrompt(''); setError(null); }}
            className="w-full mt-auto py-2 px-4 bg-gray-700 text-gray-300 font-semibold rounded-md hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Start a New Story
          </button>
        )}
      </aside>

      {/* --- Right Panel (Story Viewer) --- */}
      <main className="w-full lg:flex-1 bg-gray-800/30 rounded-xl shadow-inner border border-gray-800 p-4" style={{minHeight: '80vh'}}>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
