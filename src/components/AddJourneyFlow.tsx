import React, { useState } from 'react';
import { ArrowLeft, Save, Power, Check } from 'lucide-react';
import { JourneyProvider, useJourney } from '../context/JourneyContext';
import { Journey } from '../types/journey';
import CreateJourneyTab from './tabs/CreateJourneyTab';
import PropertiesTab from './tabs/PropertiesTab';
import NodesTab from './tabs/NodesTab';
import FunctionsTab from './tabs/FunctionsTab';
import NodeFunctionMappingTab from './tabs/NodeFunctionMappingTab';
import EdgesTab from './tabs/EdgesTab';
import PreviewTab from './tabs/PreviewTab';

interface AddJourneyFlowProps {
  onBack: () => void;
  initialJourney?: Journey;
  isPreviewOnly?: boolean;
}

const tabs = [
  { id: 'create', label: 'Create Journey', component: CreateJourneyTab },
  { id: 'properties', label: 'Properties', component: PropertiesTab },
  { id: 'nodes', label: 'Nodes', component: NodesTab },
  { id: 'functions', label: 'Functions', component: FunctionsTab },
  { id: 'mapping', label: 'Node-Function Mapping', component: NodeFunctionMappingTab },
  { id: 'edges', label: 'Edges', component: EdgesTab },
  { id: 'preview', label: 'Preview', component: PreviewTab }
];

const AddJourneyFlowContent: React.FC<{ onBack: () => void; isPreviewOnly?: boolean }> = ({ onBack, isPreviewOnly = false }) => {
  const [activeTab, setActiveTab] = useState(isPreviewOnly ? 6 : 0); // Start at preview tab if preview-only
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const { journey, saveJourney, activateJourney } = useJourney();

  const handleNext = () => {
    if (!isPreviewOnly && activeTab < tabs.length - 1) {
      setActiveTab(activeTab + 1);
    }
  };

  const handlePrevious = () => {
    if (!isPreviewOnly && activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
  };

  const handleSkip = () => {
    if (!isPreviewOnly && activeTab < tabs.length - 1) {
      setActiveTab(activeTab + 1);
    }
  };

  const handleSave = () => {
    if (!journey.name.trim()) {
      alert('Journey name is required before saving');
      return;
    }
    
    setSaveStatus('saving');
    
    try {
      saveJourney();
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
        onBack();
      }, 1500);
    } catch (error) {
      console.error('Error saving journey:', error);
      setSaveStatus('idle');
      alert('Error saving journey. Please try again.');
    }
  };

  const ActiveComponent = tabs[activeTab].component;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {journey.name || 'New Journey'}
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              {!isPreviewOnly && (
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  saveStatus === 'saved'
                    ? 'bg-green-600 text-white'
                    : saveStatus === 'saving'
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {saveStatus === 'saved' ? (
                  <>
                    <Check size={16} />
                    Saved
                  </>
                ) : saveStatus === 'saving' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Journey
                  </>
                )}
              </button>
              )}
              {!isPreviewOnly && (
              <button
                onClick={activateJourney}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  journey.isActive
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                <Power size={16} />
                {journey.isActive ? 'Deactivate' : 'Activate'}
              </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => !isPreviewOnly && setActiveTab(index)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    index === activeTab
                      ? 'border-blue-500 text-blue-600'
                      : isPreviewOnly 
                        ? 'border-transparent text-gray-300 cursor-not-allowed'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  disabled={isPreviewOnly && index !== 6}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            <ActiveComponent />
          </div>

          {!isPreviewOnly && (
          <div className="border-t px-6 py-4 flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={activeTab === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <div className="flex gap-2">
              {activeTab < tabs.length - 1 && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Skip
                </button>
              )}
              
              <button
                onClick={handleNext}
                hidden={activeTab === tabs.length - 1}
                disabled={activeTab === tabs.length - 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {activeTab === tabs.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AddJourneyFlow: React.FC<AddJourneyFlowProps> = ({ onBack, initialJourney, isPreviewOnly }) => {
  return (
    <JourneyProvider initialJourney={initialJourney}>
      <AddJourneyFlowContent onBack={onBack} isPreviewOnly={isPreviewOnly} />
    </JourneyProvider>
  );
};

export default AddJourneyFlow;