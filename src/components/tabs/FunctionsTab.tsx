import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useJourney } from '../../context/JourneyContext';
import { Function as JourneyFunction, Property } from '../../types/journey';
import axios from '../../lib/axios';

// Define the type for formData
interface FormDataType {
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
    requestBody: { id: string; apiField: string; property: string }[];
    requestBodyPath: { [key: string]: string };
  };
  inputProperties: { [key: string]: string };
  outputProperties: { [key: string]: string };
}

// Utility to normalize headers to an array
function normalizeHeaders(
  headers: any,
  headerParams: { [key: string]: string } = {}
): Array<{ key: string; type: 'constant' | 'property'; value: string }> {
  if (Array.isArray(headers)) return headers;
  if (!headers) return [];
  if (typeof headers === 'object') {
    // If it's an object of key-value pairs (e.g., { Authorization: 'Bearer ...' })
    if (Object.values(headers).every(v => typeof v === 'string')) {
      return Object.entries(headers).map(([key, value]) => ({
        key,
        type: key in headerParams ? 'property' : 'constant',
        value: value as string,
      }));
    }
    // If it's an object of header objects, convert to array
    return Object.values(headers).filter(
      h => h && typeof h === 'object' && 'key' in h && 'type' in h && 'value' in h
    ) as Array<{ key: string; type: 'constant' | 'property'; value: string }>;
  }
  return [];
}

// Utility to normalize requestBody to an array
function normalizeRequestBody(requestBody: any): Array<{ id: string; apiField: string; property: string }> {
  if (!requestBody) return [];
  // If already an array, ensure all items have required fields
  if (Array.isArray(requestBody)) {
    return requestBody
      .filter(
        item =>
          item &&
          typeof item === 'object' &&
          'id' in item &&
          'apiField' in item &&
          'property' in item
      )
      .map(item => ({
        id: item.id,
        apiField: item.apiField,
        property: item.property,
      }));
  }
  // If it's an object, try to convert to array of {id, apiField, property}
  if (typeof requestBody === 'object') {
    // If it's a mapping from id to {apiField, property}
    if (
      Object.values(requestBody).every(
        item =>
          item &&
          typeof item === 'object' &&
          ('apiField' in item || 'property' in item)
      )
    ) {
      return Object.entries(requestBody)
        .map(([id, item]: [string, any]) => {
          // If item already has id, use it, else use the key
          return {
            id: item.id || id,
            apiField: item.apiField || '',
            property: item.property || '',
          };
        })
        .filter(
          item =>
            item.id &&
            typeof item.apiField === 'string' &&
            typeof item.property === 'string'
        );
    }
    // If it's an object of {id, apiField, property} objects
    return Object.values(requestBody)
      .filter(
        item =>
          item &&
          typeof item === 'object' &&
          'id' in item &&
          'apiField' in item &&
          'property' in item
      )
      .map(item => ({
        id: item.id,
        apiField: item.apiField,
        property: item.property,
      }));
  }
  return [];
}

const FunctionsTab: React.FC = () => {
  const { journey, addFunction, updateFunction, deleteFunction } = useJourney();
  const [isEditing, setIsEditing] = useState(false);
  const [editingFunction, setEditingFunction] = useState<JourneyFunction | null>(null);
  const [allFunctions, setAllFunctions] = useState<JourneyFunction[]>([]);
  const [headerKeys, setHeaderKeys] = useState<{ [key: string]: string }>({});
  const [inputPropertyKeys, setInputPropertyKeys] = useState<{ [key: string]: string }>({});
  const [outputPropertyKeys, setOutputPropertyKeys] = useState<{ [key: string]: string }>({});
  const [formData, setFormData] = useState<FormDataType>({
    referenceId: '',
    name: '',
    type: '',
    config: {
      host: '',
      path: '',
      method: 'GET',
      header_params: {},
      headers: [],
      requestBody: [],
      requestBodyPath: {}
    },
    inputProperties: {},
    outputProperties: {}
  });

  // Fetch all available functions from API on mount
  useEffect(() => {
    axios.get('/api/v1/config/functions/all')
      .then(res => {
        console.log(res.data.data);
        setAllFunctions((res.data.data || []) as JourneyFunction[]);
        // Removed incorrect setFormData logic for headers
      })
      .catch(err => {
        console.error('Failed to fetch all functions:', err);
      });
  }, []);

  // Update formData when editingFunction changes
  useEffect(() => {
    
    if (editingFunction) {
      const { host, path, httpMethod, header_params, headerParams, headers, requestBody, requestBodyPath } = editingFunction.config;
      const safeHeaderParams = header_params || headerParams || {};
      setFormData({
        referenceId: editingFunction.referenceId,
        name: editingFunction.name,
        type: editingFunction.type,
        config: {
          host: host || '',
          path: path || '',
          method: httpMethod || 'GET',
          header_params: safeHeaderParams,
          headers: normalizeHeaders(headers, safeHeaderParams),
          requestBody: normalizeRequestBody(requestBody),
          requestBodyPath: requestBodyPath || {}
        },
        inputProperties: editingFunction.inputProperties || {},
        outputProperties: editingFunction.outputProperties || {}
      });
    }
  }, [editingFunction]);

  // Helper to get union of allFunctions and journey.functions by id
  const displayedFunctions = useMemo(() => {
    const journeyFnMap = new Map((journey.functions || []).map(fn => [fn.referenceId, fn]));
    const allFnMap = new Map((allFunctions || []).map(fn => [fn.referenceId, fn]));
    // Merge: journey.functions take precedence
    const union = new Map([...allFnMap, ...journeyFnMap]);
    
    return Array.from(union.values());
  }, [allFunctions, journey.functions]);

  const handleHeaderParamKeyChange = (oldKey: string, newKey: string) => {
  setHeaderKeys(prev => ({
    ...prev,
    [oldKey]: newKey
  }));
};

const handleHeaderParamKeyBlur = (oldKey: string) => {
  const newKey = headerKeys[oldKey] || oldKey;
  if (newKey !== oldKey && newKey.trim() !== '') {
    const value = formData.config.header_params[oldKey];
    const newParams = { ...formData.config.header_params };
    delete newParams[oldKey];
    newParams[newKey] = value;
    setFormData(prev => ({
      ...prev,
      config: { ...prev.config, header_params: newParams }
    }));
    setHeaderKeys(prev => {
      const updated = { ...prev };
      delete updated[oldKey];
      return updated;
    });
  }
};

const handleHeaderKeyChange = (oldKey: string, newKey: string) => {
  setHeaderKeys(prev => ({
    ...prev,
    [oldKey]: newKey
  }));
};

const handleHeaderKeyBlur = (oldKey: string) => {
  const newKey = headerKeys[oldKey] || oldKey;
  if (newKey !== oldKey && newKey.trim() !== '') {
    const value = formData.config.headers.find(h => h.key === oldKey)?.value;
    setFormData(prev => {
      const headers = [...prev.config.headers];
      const index = headers.findIndex(h => h.key === oldKey);
      if (index !== -1) {
        headers[index] = { ...headers[index], key: newKey };
      }
      return {
        ...prev,
        config: {
          ...prev.config,
          headers
        }
      };
    });
  }
};

// Request Body logic: key = API field, value = property name
// Add, update, remove for requestBody
const addRequestBodyField = () => {
  setFormData(prev => ({
    ...prev,
    config: {
      ...prev.config,
      requestBody: [
        ...prev.config.requestBody,
        { id: `body_${Date.now()}`, apiField: '', property: '' }
      ]
    }
  }));
};
// Update requestBody logic to sync with input_properties
const updateRequestBodyField = (id: string, field: 'apiField' | 'property', value: string) => {
  setFormData(prev => {
    const newRequestBody = prev.config.requestBody.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    
    let newInputProperties = { ...prev.inputProperties };
    
    // Clear existing request body mappings from input properties
    prev.config.requestBody.forEach(item => {
      if (item.property && newInputProperties[item.property]) {
        delete newInputProperties[item.property];
      }
    });
    
    // Add new mappings to input properties
    newRequestBody.forEach(item => {
      if (item.property) {
        const prop = journey.properties.find(p => p.key === item.property);
        if (prop) {
          newInputProperties[prop.key] = prop.type;
        }
      }
    });
    
    return {
      ...prev,
      config: {
        ...prev.config,
        requestBody: newRequestBody
      },
      input_properties: newInputProperties
    };
  });
};
const removeRequestBodyField = (id: string) => {
  setFormData(prev => ({
    ...prev,
    config: {
      ...prev.config,
      requestBody: prev.config.requestBody.filter(item => item.id !== id)
    }
  }));
};

// Remove Request Body Path logic and UI
// Request Body Path logic: key = property name, value = JSON path
// const addRequestBodyPathField = () => {
//   const key = `bodypath_${Date.now()}`;
//   setFormData(prev => ({
//     ...prev,
//     config: {
//       ...prev.config,
//       requestBodyPath: {
//         ...prev.config.requestBodyPath,
//         [key]: ''
//       }
//     }
//   }));
// };
// const updateRequestBodyPathField = (key: string, value: string) => {
//   setFormData(prev => ({
//     ...prev,
//     config: {
//       ...prev.config,
//       requestBodyPath: {
//         ...prev.config.requestBodyPath,
//         [key]: value
//       }
//     }
//   }));
// };
// const removeRequestBodyPathField = (key: string) => {
//   setFormData(prev => ({
//     ...prev,
//     config: {
//       ...prev.config,
//       requestBodyPath: Object.fromEntries(
//         Object.entries(prev.config.requestBodyPath).filter(([k]) => k !== key)
//       )
//     }
//   }));
// };

const handleInputPropertyKeyChange = (oldKey: string, newKey: string) => {
  setInputPropertyKeys(prev => ({
    ...prev,
    [oldKey]: newKey
  }));
};

const handleInputPropertyKeyBlur = (oldKey: string) => {
  const newKey = inputPropertyKeys[oldKey] || oldKey;
  if (newKey !== oldKey && newKey.trim() !== '') {
    const value = formData.inputProperties[oldKey];
    const newInputs = { ...formData.inputProperties };
    delete newInputs[oldKey];
    newInputs[newKey] = value;
    setFormData(prev => ({
      ...prev,
      input_properties: newInputs
    }));
    setInputPropertyKeys(prev => {
      const updated = { ...prev };
      delete updated[oldKey];
      return updated;
    });
  }
};

const handleOutputPropertyKeyChange = (oldKey: string, newKey: string) => {
  setOutputPropertyKeys(prev => ({
    ...prev,
    [oldKey]: newKey
  }));
};

const handleOutputPropertyKeyBlur = (oldKey: string) => {
  const newKey = outputPropertyKeys[oldKey] || oldKey;
  if (newKey !== oldKey && newKey.trim() !== '') {
    const value = formData.outputProperties[oldKey];
    const newOutputs = { ...formData.outputProperties };
    delete newOutputs[oldKey];
    newOutputs[newKey] = value;
    setFormData(prev => ({
      ...prev,
      outputProperties: newOutputs
    }));
    setOutputPropertyKeys(prev => {
      const updated = { ...prev };
      delete updated[oldKey];
      return updated;
    });
  }
};

  const resetForm = () => {
    setFormData({
      referenceId: '',
      name: '',
      type: '',
      config: {
        host: '',
        path: '',
        method: 'GET',
        header_params: {},
        headers: [],
        requestBody: [],
        requestBodyPath: {}
      },
      inputProperties: {},
      outputProperties: {}
    });
    setIsEditing(false);
    setEditingFunction(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Function name is required');
      return;
    }
    
    if (!formData.type) {
      alert('Function type is required');
      return;
    }
    
    let functionData = {
      ...formData,
      config: {
        ...formData.config
      }
    };
    
    if (!functionData.referenceId) {
      functionData = { ...functionData, referenceId: Date.now().toString() };
    }
    
    if (editingFunction) {
      updateFunction(editingFunction.referenceId, functionData);
      setAllFunctions(prev => prev.map(fn => fn.referenceId === editingFunction.referenceId ? { ...editingFunction, ...functionData } : fn));
    } else {
      addFunction(functionData);
      setAllFunctions(prev => [...prev, functionData]);
    }
    
    resetForm();
  };

  const handleEdit = (func: JourneyFunction) => {
    setEditingFunction(func);
    console.log(func);
    const { host, path, httpMethod, header_params, headerParams, headers, requestBody, requestBodyPath } = func.config;
    const safeHeaderParams = header_params || headerParams || {};
    setFormData({
      referenceId: func.referenceId,
      name: func.name,
      type: func.type,
      config: {
        host: host || '',
        path: path || '',
        method: httpMethod || 'GET',
        header_params: safeHeaderParams,
        headers: normalizeHeaders(headers, safeHeaderParams),
        requestBody: normalizeRequestBody(requestBody),
        requestBodyPath: requestBodyPath || {}
      },
      inputProperties: func.inputProperties || {},
      outputProperties: func.outputProperties || {}
    });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    deleteFunction(id);
  };

  const addHeaderField = () => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        headers: [
          ...prev.config.headers,
          { key: '', type: 'constant', value: '' }
        ]
      }
    }));
  };

  const updateHeaderField = (index: number, field: 'key' | 'type' | 'value', value: string) => {
    setFormData(prev => {
      const headers = [...prev.config.headers];
      headers[index] = { ...headers[index], [field]: value };

      let newHeaderParams = { ...prev.config.header_params };
      let newInputProperties = { ...prev.inputProperties };
      
      // If the value field is changed and type is property, update header_params
      if (field === 'value' && headers[index].type === 'property') {
        const prop = journey.properties.find(p => p.referenceId === value);
        if (prop) {
          newHeaderParams[prop.key] = prop.type;
          newInputProperties[prop.key] = prop.type;
        }
      } else if (field === 'type' && value === 'property') {
        // Reset value when switching to property type
        headers[index].value = '';
      }

      return {
        ...prev,
        config: {
          ...prev.config,
          headers,
          header_params: newHeaderParams
        },
        input_properties: newInputProperties
      };
    });
  };

  const removeHeaderField = (index: number) => {
    setFormData(prev => {
      const headers = [...prev.config.headers];
      const removedHeader = headers[index];

      let newHeaderParams = { ...prev.config.header_params };
      let newInputProperties = { ...prev.inputProperties };
      
      if (removedHeader.type === 'property') {
        const prop = journey.properties.find(p => p.referenceId === removedHeader.value);
        if (prop) {
          delete newHeaderParams[prop.key];
          delete newInputProperties[prop.key];
        }
      }

      headers.splice(index, 1);

      return {
        ...prev,
        config: {
          ...prev.config,
          headers,
          header_params: newHeaderParams
        },
        input_properties: newInputProperties
      };
    });
  };

  const addHeaderParamField = () => {
    const key = `param_${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        header_params: {
          ...prev.config.header_params,
          [key]: ''
        }
      }
    }));
  };

  const updateHeaderParamField = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        header_params: {
          ...prev.config.header_params,
          [key]: value
        }
      }
    }));
  };

  const removeHeaderParamField = (key: string) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        header_params: Object.fromEntries(
          Object.entries(prev.config.header_params).filter(([k]) => k !== key)
        )
      }
    }));
  };

  const addInputProperty = () => {
    const key = `input_${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      input_properties: {
        ...prev.inputProperties,
        [key]: ''
      }
    }));
  };

  const updateInputProperty = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      input_properties: {
        ...prev.inputProperties,
        [key]: value
      }
    }));
  };

  const removeInputProperty = (key: string) => {
    setFormData(prev => ({
      ...prev,
      input_properties: Object.fromEntries(
        Object.entries(prev.inputProperties).filter(([k]) => k !== key)
      )
    }));
  };

  const addOutputProperty = () => {
    const key = `output_${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      output_properties: {
        ...prev.outputProperties,
        [key]: ''
      }
    }));
  };

  const updateOutputProperty = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      output_properties: {
        ...prev.outputProperties,
        [key]: value
      }
    }));
  };

  const removeOutputProperty = (key: string) => {
    setFormData(prev => ({
      ...prev,
      output_properties: Object.fromEntries(
        Object.entries(prev.outputProperties).filter(([k]) => k !== key)
      )
    }));
  };

  // JSON Previewer logic
  const jsonPreview = useMemo(() => {
    // req_body: API field -> property name
    const reqBodyObj: Record<string, string> = {};
    normalizeRequestBody(formData.config.requestBody).forEach(item => {
      if (item.apiField && item.property) reqBodyObj[item.apiField] = item.property;
    });
    const req_body = JSON.stringify(reqBodyObj);
    // req_body_path: property name -> $.<API field> (auto-generated)
    const req_body_path: Record<string, string> = {};
    normalizeRequestBody(formData.config.requestBody).forEach(item => {
      if (item.apiField && item.property) req_body_path[item.property] = `$.${item.apiField}`;
    });

    // header_param: just use formData.config.header_params
    const header_param = { ...(formData.config.header_params || {}) };

    // headers: key is header.key, value is either header.value (custom) or property key (if type is property)
    const headers: Record<string, string> = {};
    const safeHeaders = normalizeHeaders(formData.config.headers || [], formData.config.header_params);
    safeHeaders.forEach(h => {
      if (!h.key) return;
      if (h.type === 'constant') {
        headers[h.key] = h.value;
      } else if (h.type === 'property') {
        const prop = journey.properties.find(p => p.key === h.value);
        headers[h.key] = prop ? prop.key : h.value;
      }
    });

    // inputProperties: key is property key, value is type
    const inputProperties: Record<string, string> = {};
    Object.entries(formData.inputProperties || {}).forEach(([key, type]) => {
      inputProperties[key] = type;
    });

    // outputProperties: key is property key, value is type
    const outputProperties: Record<string, string> = {};
    Object.entries(formData.outputProperties || {}).forEach(([key, type]) => {
      outputProperties[key] = type;
    });

    

    const previewObj = {
      name: formData.name,
      type: formData.type,
      config: {
        host: formData.config.host,
        path: formData.config.path,
        method: formData.config.method,
        req_body: formData.config.requestBody,
        req_body_path: formData.config.requestBodyPath,
        header_param,
        headers
      },
      inputProperties,
      outputProperties
    };
    

    return JSON.stringify(previewObj, null, 2);
  }, [formData, journey.properties]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Functions</h2>
        <button
          onClick={() => setIsEditing(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Add Function
        </button>
      </div>

      {isEditing && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-gray-900 mb-4">
            {editingFunction ? 'Edit Function' : 'Add New Function'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Send Email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" disabled>Select type</option>
                  <option value="API">API</option>
                  <option value="KAFKA">KAFKA</option>
                </select>
                </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                  <input
                    type="text"
                    value={formData.config.host}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      config: { ...formData.config, host: e.target.value } 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://api.example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
                  <input
                    type="text"
                    value={formData.config.path}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      config: { ...formData.config, path: e.target.value } 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="/api/v1/users"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select
                    value={formData.config.method}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      config: { ...formData.config, method: e.target.value } 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

              </div>

              

              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Headers</label>
                  <button
                    type="button"
                    onClick={addHeaderField}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Header
                  </button>
                </div>
                <div className="space-y-2">
                  {normalizeHeaders(formData.config.headers, formData.config.header_params).map((header, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={header.key}
                        onChange={e => updateHeaderField(idx, 'key', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Header key"
                      />
                      <select
                        value={header.type}
                        onChange={e => updateHeaderField(idx, 'type', e.target.value)}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="constant">Constant</option>
                        <option value="property">Property</option>
                      </select>
                      {header.type === 'constant' ? (
                        <input
                          type="text"
                          value={header.value}
                          onChange={e => updateHeaderField(idx, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Header value"
                        />
                      ) : (
                        <select
                          value={header.value}
                          onChange={e => updateHeaderField(idx, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="" disabled>Select property</option>
                          {journey.properties.map((prop) => (
                            <option key={prop.referenceId} value={prop.referenceId}>{prop.key}</option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => removeHeaderField(idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4" hidden>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Header Params</label>
                  <button
                    type="button"
                    onClick={addHeaderParamField}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Header Param
                  </button>
                </div>
                <div className="space-y-2">
                  {Object.entries(formData.config.header_params || {}).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <input
                        type="text"
                        value={headerKeys[key] ?? key}
                        onChange={(e) => handleHeaderParamKeyChange(key, e.target.value)}
                        onBlur={() => handleHeaderParamKeyBlur(key)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Param key"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateHeaderParamField(key, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Param value"
                      />
                      <button
                        type="button"
                        onClick={() => removeHeaderParamField(key)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {formData.config.method !== 'GET' && (
                <>
                  {/* Request Body Section */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Request Body</label>
                      <button
                        type="button"
                        onClick={addRequestBodyField}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add Body Field
                      </button>
                    </div>
                    <div className="space-y-2">
                      {normalizeRequestBody(formData.config.requestBody).map((item) => (
                        <div key={item.id} className="flex gap-2">
                          {/* API field name (text input) */}
                          <input
                            type="text"
                            value={item.apiField}
                            onChange={e => updateRequestBodyField(item.id, 'apiField', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Body key (API field)"
                          />
                          {/* Property name dropdown */}
                          <select
                            value={item.property}
                            onChange={e => updateRequestBodyField(item.id, 'property', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="" disabled>Select property</option>
                            {journey.properties.map((prop) => (
                              <option key={prop.referenceId} value={prop.referenceId}>{prop.key}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeRequestBodyField(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Request Body Path Section is now hidden/removed */}
                </>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div hidden>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Input Properties</label>
                    <button
                      type="button"
                      onClick={addInputProperty}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + Add Input
                    </button>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(formData.inputProperties || {}).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <input
                          type="text"
                          value={inputPropertyKeys[key] ?? key}
                          onChange={(e) => handleInputPropertyKeyChange(key, e.target.value)}
                          onBlur={() => handleInputPropertyKeyBlur(key)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Input key"
                        />
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => updateInputProperty(key, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Input value"
                        />
                        <button
                          type="button"
                          onClick={() => removeInputProperty(key)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Output Properties</label>
                    <button
                      type="button"
                      onClick={addOutputProperty}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + Add Output
                    </button>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(formData.outputProperties || {}).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <input
                          type="text"
                          value={outputPropertyKeys[key] ?? key}
                          onChange={(e) => handleOutputPropertyKeyChange(key, e.target.value)}
                          onBlur={() => handleOutputPropertyKeyBlur(key)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Output key"
                        />
                        <select
                          value={value}
                          onChange={(e) => updateOutputProperty(key, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select type</option>
                          <option value="STRING">STRING</option>
                          <option value="BOOLEAN">BOOLEAN</option>
                          <option value="DATE">DATE</option>
                          <option value="NUMBER">NUMBER</option>
                          <option value="TIMESTAMP">TIMESTAMP</option>
                          <option value="RANGE">RANGE</option>
                          <option value="LIST">LIST</option>
                          <option value="MAP">MAP</option>
                          
                        </select>
                        <button
                          type="button"
                          onClick={() => removeOutputProperty(key)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Save size={16} />
                {editingFunction ? 'Update' : 'Add'} Function
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {/* JSON Previewer: show when creating or editing a function */}
      {isEditing && (
        <div className="mt-8">
          <h4 className="font-medium text-gray-900 mb-2">JSON Preview</h4>
          <pre className="bg-gray-900 text-green-200 p-4 rounded-lg overflow-x-auto text-xs">
            {jsonPreview}
          </pre>
        </div>
      )}

      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h3 className="font-medium text-gray-900">Function List</h3>
        </div>
        
        {displayedFunctions.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No functions created yet. Click "Add Function" to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {displayedFunctions.map((fn) => (
              <div key={fn.referenceId} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">{fn.name}</h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {fn.type}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <div className="font-medium">Method: <span className="font-normal">{fn.config.httpMethod}</span></div>
                      <div className='font-medium'>Host: <span className="font-normal">{fn.config.host}</span></div>
                      <div className='font-medium'>Path: <span className="font-normal">{fn.config.path}</span></div>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>Headers: {Array.isArray(fn.config.headers) ? fn.config.headers.length : Object.keys(fn.config.headers || {}).length}</span>
                      <span>Inputs: {Object.keys(fn.inputProperties || {}).length}</span>
                      <span>Outputs: {Object.keys(fn.outputProperties || {}).length}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(fn)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(fn.referenceId)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FunctionsTab;