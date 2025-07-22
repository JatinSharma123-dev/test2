import React, { useState } from 'react';
import HomePage from './components/HomePage';
import AddJourneyFlow from './components/AddJourneyFlow';
import { Journey } from './types/journey';

type Page = 'home' | 'add-journey' | 'edit-journey' | 'preview-only';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [editingJourney, setEditingJourney] = useState<Journey | undefined>();

  const handleCreateJourney = () => {
    setEditingJourney(undefined);
    setCurrentPage('add-journey');
  };

  const handleEditJourney = (journey: Journey) => {
    setEditingJourney(journey);
    setCurrentPage('edit-journey');
  };

  const handlePreviewJourney = (journey: Journey) => {
    setEditingJourney(journey);
    setCurrentPage('preview-only');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    setEditingJourney(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentPage === 'home' && (
        <HomePage 
          onEditJourney={handleEditJourney}
          onPreviewJourney={handlePreviewJourney}
          onCreateJourney={handleCreateJourney}
        />
      )}
      
      {(currentPage === 'add-journey' || currentPage === 'edit-journey' || currentPage === 'preview-only') && (
        <AddJourneyFlow 
          onBack={handleBackToHome}
          initialJourney={editingJourney}
          isPreviewOnly={currentPage === 'preview-only'}
        />
      )}
    </div>
  );
}

export default App;