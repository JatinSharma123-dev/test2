import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Journey, JourneyContextType, Property, Node, Function, NodeFunctionMapping, Edge } from '../types/journey';

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

export const useJourney = () => {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error('useJourney must be used within a JourneyProvider');
  }
  return context;
};

interface JourneyProviderProps {
  children: ReactNode;
  initialJourney?: Journey;
}

export const JourneyProvider: React.FC<JourneyProviderProps> = ({ children, initialJourney }) => {
  const createEmptyJourney = (): Journey => ({
    id: Date.now().toString(),
    name: '',
    description: '',
    properties: [],
    nodes: [],
    functions: [],
    mappings: [],
    edges: [],
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const [journey, setJourney] = useState<Journey>(initialJourney || createEmptyJourney());

  const updateJourney = (updates: Partial<Journey>) => {
    setJourney(prev => ({ ...prev, ...updates, updatedAt: new Date() }));
  };

  const addProperty = (property: Omit<Property, 'id'>) => {
    const newProperty: Property = {
      ...property,
      id: Date.now().toString()
    };
    setJourney(prev => ({
      ...prev,
      properties: [...prev.properties, newProperty],
      updatedAt: new Date()
    }));
  };

  const updateProperty = (id: string, property: Partial<Property>) => {
    setJourney(prev => ({
      ...prev,
      properties: prev.properties.map(p => p.id === id ? { ...p, ...property } : p),
      updatedAt: new Date()
    }));
  };

  const deleteProperty = (id: string) => {
    setJourney(prev => ({
      ...prev,
      properties: prev.properties.filter(p => p.id !== id),
      nodes: prev.nodes.map(n => ({ ...n, properties: n.properties.filter(pId => pId !== id) })),
      // Also clean up function input/output properties that reference this property
      functions: prev.functions.map(f => {
        const deletedProperty = prev.properties.find(p => p.id === id);
        if (!deletedProperty) return f;
        
        const newInputProperties = { ...f.input_properties };
        const newOutputProperties = { ...f.output_properties };
        
        delete newInputProperties[deletedProperty.key];
        delete newOutputProperties[deletedProperty.key];
        
        return {
          ...f,
          input_properties: newInputProperties,
          output_properties: newOutputProperties
        };
      }),
      updatedAt: new Date()
    }));
  };

  const addNode = (node: Omit<Node, 'id'>) => {
    const newNode: Node = {
      ...node,
      id: Date.now().toString()
    };
    setJourney(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      updatedAt: new Date()
    }));
  };

  const updateNode = (id: string, node: Partial<Node>) => {
    setJourney(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === id ? { ...n, ...node } : n),
      updatedAt: new Date()
    }));
  };

  const deleteNode = (id: string) => {
    setJourney(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== id),
      edges: prev.edges.filter(e => e.fromNodeId !== id && e.toNodeId !== id),
      mappings: prev.mappings.filter(m => m.nodeId !== id),
      updatedAt: new Date()
    }));
  };

  const addFunction = (func: Omit<Function, 'id'>) => {
    const newFunction: Function = func;
    setJourney(prev => ({
      ...prev,
      functions: [...prev.functions, newFunction],
      updatedAt: new Date()
    }));
  };

  const updateFunction = (id: string, func: Partial<Function>) => {
    setJourney(prev => ({
      ...prev,
      functions: prev.functions.map(f => f.referenceId === id ? { ...f, ...func } : f),
      updatedAt: new Date()
    }));
  };

  const deleteFunction = (id: string) => {
    setJourney(prev => ({
      ...prev,
      functions: prev.functions.filter(f => f.referenceId !== id),
      mappings: prev.mappings.filter(m => m.functionId !== id),
      updatedAt: new Date()
    }));
  };

  const addMapping = (mapping: Omit<NodeFunctionMapping, 'id'>) => {
    const newMapping: NodeFunctionMapping = {
      ...mapping,
      id: Date.now().toString()
    };
    setJourney(prev => ({
      ...prev,
      mappings: [...prev.mappings, newMapping],
      updatedAt: new Date()
    }));
  };

  const updateMapping = (id: string, mapping: Partial<NodeFunctionMapping>) => {
    setJourney(prev => ({
      ...prev,
      mappings: prev.mappings.map(m => m.id === id ? { ...m, ...mapping } : m),
      updatedAt: new Date()
    }));
  };

  const deleteMapping = (id: string) => {
    setJourney(prev => ({
      ...prev,
      mappings: prev.mappings.filter(m => m.id !== id),
      updatedAt: new Date()
    }));
  };

  const addEdge = (edge: Omit<Edge, 'id'>) => {
    const newEdge: Edge = {
      ...edge,
      id: Date.now().toString()
    };
    setJourney(prev => {
      // Remove default edge between start and end nodes when adding first custom edge
      const filteredEdges = prev.edges.length === 0 ? 
        prev.edges.filter(e => !(e.fromNodeId === 'start' && e.toNodeId === 'end')) : 
        prev.edges;
      
      return {
        ...prev,
        edges: [...filteredEdges, newEdge],
        updatedAt: new Date()
      };
    });
  };

  const updateEdge = (id: string, edge: Partial<Edge>) => {
    setJourney(prev => ({
      ...prev,
      edges: prev.edges.map(e => e.id === id ? { ...e, ...edge } : e),
      updatedAt: new Date()
    }));
  };

  const deleteEdge = (id: string) => {
    setJourney(prev => ({
      ...prev,
      edges: prev.edges.filter(e => e.id !== id),
      updatedAt: new Date()
    }));
  };

  const saveJourney = () => {
    if (!journey.id) {
      setJourney(prev => ({ ...prev, id: Date.now().toString() }));
    }
    
    const savedJourneys = JSON.parse(localStorage.getItem('journeys') || '[]');
    const existingIndex = savedJourneys.findIndex((j: Journey) => j.id === journey.id);
    
    const journeyToSave = { ...journey, updatedAt: new Date() };
    
    if (existingIndex >= 0) {
      savedJourneys[existingIndex] = journeyToSave;
    } else {
      journeyToSave.id = journeyToSave.id || Date.now().toString();
      savedJourneys.push(journeyToSave);
    }
    
    localStorage.setItem('journeys', JSON.stringify(savedJourneys));
    
    // Update the current journey state with the saved data
    setJourney(journeyToSave);
  };

  const activateJourney = () => {
    setJourney(prev => ({ ...prev, isActive: !prev.isActive, updatedAt: new Date() }));
  };

  return (
    <JourneyContext.Provider value={{
      journey,
      updateJourney,
      addProperty,
      updateProperty,
      deleteProperty,
      addNode,
      updateNode,
      deleteNode,
      addFunction,
      updateFunction,
      deleteFunction,
      addMapping,
      updateMapping,
      deleteMapping,
      addEdge,
      updateEdge,
      deleteEdge,
      saveJourney,
      activateJourney
    }}>
      {children}
    </JourneyContext.Provider>
  );
};