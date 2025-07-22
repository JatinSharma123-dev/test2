export interface Property {
  referenceId: string;
  key: string;
  type: string;
  validationCondition?: string;
}

export interface Node {
  id: string;
  name: string;
  type: string;
  description: string;
  properties: string[]; // Property IDs
  x?: number;
  y?: number;
}

export interface Function {
  referenceId: string;
  name: string;
  type: string;
  config: {
    host: string;
    path: string;
    method: string;
    header_params: { [key: string]: string };
    headers: Array<{
      key: string;
      type: 'constant' | 'property';
      value: string;
    }>;
    requestBody?: Array<{
      id: string;
      apiField: string;
      property: string;
    }>;
    requestBodyPath?: { [key: string]: string };
    [key: string]: any;
  };
  inputProperties: { [key: string]: string };
  outputProperties: { [key: string]: string };
}

export interface NodeFunctionMapping {
  id: string;
  name: string;
  description: string;
  nodeId: string;
  functionId: string;
  condition: string;
  variableMappings?: Array<{
    mappingType: string;
    strategy: string;
    sourceVariableName: string;
    sourceVariableType: string;
    sourceVariableExpression: string;
    mandatory: boolean;
    targetParameterName: string;
    targetParameterType: string;
    transformationExpression: string | null;
    defaultValue: string | null;
    id: string;
  }>;
}

export interface Edge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  validationCondition: string;
}

export interface Journey {
  referenceId: string;
  name: string;
  description: string;
  nodes: Node[];
  properties: Property[];
  functions: Function[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JourneyContextType {
  journey: Journey;
  updateJourney: (updates: Partial<Journey>) => void;
  addProperty: (property: Omit<Property, 'id'>) => void;
  updateProperty: (id: string, property: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  addNode: (node: Omit<Node, 'id'>) => void;
  updateNode: (id: string, node: Partial<Node>) => void;
  deleteNode: (id: string) => void;
  addFunction: (func: Omit<Function, 'id'>) => void;
  updateFunction: (id: string, func: Partial<Function>) => void;
  deleteFunction: (id: string) => void;
  addMapping: (mapping: Omit<NodeFunctionMapping, 'id'>) => void;
  updateMapping: (id: string, mapping: Partial<NodeFunctionMapping>) => void;
  deleteMapping: (id: string) => void;
  addEdge: (edge: Omit<Edge, 'id'>) => void;
  updateEdge: (id: string, edge: Partial<Edge>) => void;
  deleteEdge: (id: string) => void;
  saveJourney: () => void;
  activateJourney: () => void;
}