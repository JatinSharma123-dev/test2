import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useJourney } from '../../context/JourneyContext';
import { Function as JourneyFunction } from '../../types/journey';
import axios from '../../lib/axios';

interface FormData {
  referenceId: string;
  name: string;
  type: string;
  config: {
    httpMethod: string;
    host: string;
    path: string;
    headers: { [key: string]: string };
    headerParams: { [key: string]: string };
    requestBody: string | null;
    requestBodyPath: { [key: string]: string };
    timeoutMs: number;
  };
  inputProperties: { [key: string]: string };
  outputProperties: { [key: string]: string };
}

const FunctionsTab: React.FC = () => {
  const { journey, addFunction, updateFunction, deleteFunction } = useJourney();
  const [isEditing, setIsEditing] = useState(false);
  const [editingFunction, setEditingFunction] = useState<JourneyFunction | null>(null);
  const [allFunctions, setAllFunctions] = useState<JourneyFunction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    referenceId: '',
    name: '',
    type: 'API',
    config: {
      httpMethod: 'GET',
      host: '',
      path: '',
      headers: {},
      headerParams: {},
      queryParams: {},
      pathParams: {},
      requestBody: null,
      requestBodyPath: {},
      timeoutMs: 30000
    },
    inputProperties: {},
    outputProperties: {}
  });

  // Fetch all available functions from API
  useEffect(() => {
    fetchAllFunctions();
  }, []);

  const fetchAllFunctions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/v1/config/functions/all');
      const functions = response.data || []; // API returns array directly
      
      // Transform API response to match our interface
      const transformedFunctions = functions.map((func: any) => ({
        referenceId: func.referenceId,
        name: func.name,
        type: func.type,
        config: {
          httpMethod: func.config.httpMethod || 'GET',
          host: func.config.host || '',
          path: func.config.path || '',
          headers: func.config.headers || {},
          headerParams: func.config.headerParams || {},
          queryParams: func.config.queryParams || {},
          pathParams: func.config.pathParams || {},
          requestBody: func.config.requestBody || null,
          requestBodyPath: func.config.requestBodyPath || {},
          timeoutMs: func.config.timeoutMs || 30000
        },
        inputProperties: func.inputProperties || {},
        outputProperties: func.outputProperties || {},
        createdAt: func.createdAt,
        updatedAt: func.updatedAt
      }));

      setAllFunctions(transformedFunctions);
    } catch (err) {
      console.error('Failed to fetch functions:', err);
      setError('Failed to load functions from server');
    } finally {
      setLoading(false);
    }
  };

  // Get combined functions (API + journey functions)
  const displayedFunctions = React.useMemo(() => {
    const journeyFnMap = new Map((journey.functions || []).map(fn => [fn.referenceId, fn]));
    const allFnMap = new Map(allFunctions.map(fn => [fn.referenceId, fn]));
    
    // Merge: journey functions take precedence
    const union = new Map([...allFnMap, ...journeyFnMap]);
    return Array.from(union.values());
  }, [allFunctions, journey.functions]);

  const resetForm = () => {
    setFormData({
      referenceId: '',
      name: '',
      type: 'API',
      config: {
        httpMethod: 'GET',
        host: '',
        path: '',
        headers: {},
        headerParams: {},
        requestBody: '',
        requestBodyPath: {},
        timeoutMs: 30000
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
    
    let functionData = { ...formData };
    
    if (!functionData.referenceId) {
      functionData = { ...functionData, referenceId: Date.now().toString() };
    }
    
    if (editingFunction) {
      updateFunction(editingFunction.referenceId, functionData);
      setAllFunctions(prev => prev.map(fn => 
        fn.referenceId === editingFunction.referenceId 
          ? { ...editingFunction, ...functionData } 
          : fn
      ));
    } else {
      addFunction(functionData);
      setAllFunctions(prev => [...prev, functionData]);
    }
    
    resetForm();
  };

  const handleEdit = (func: JourneyFunction) => {
    setEditingFunction(func);
    setFormData({
      referenceId: func.referenceId,
      name: func.name,
      type: func.type,
      config: {
        httpMethod: func.config.httpMethod || 'GET',
        host: func.config.host || '',
        path: func.config.path || '',
        headers: func.config.headers || {},
        headerParams: func.config.headerParams || {},
        queryParams: func.config.queryParams || {},
        pathParams: func.config.pathParams || {},
        requestBody: func.config.requestBody || '',
        requestBodyPath: func.config.requestBodyPath || {},
        timeoutMs: func.config.timeoutMs || 30000
      },
      inputProperties: func.inputProperties || {},
      outputProperties: func.outputProperties || {}
    });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this function?')) {
      deleteFunction(id);
      setAllFunctions(prev => prev.filter(fn => fn.referenceId !== id));
    }
  };

  // Helper functions for form management
  const updateConfig = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: { ...prev.config, [field]: value }
    }));
  };

  const addHeader = () => {
    const key = prompt('Enter header key:');
    const value = prompt('Enter header value:');
    if (key && value) {
      setFormData(prev => ({
        ...prev,
        config: {
          ...prev.config,
          headers: { ...prev.config.headers, [key]: value }
        }
      }));
    }
  };

  const removeHeader = (key: string) => {
    setFormData(prev => {
      const newHeaders = { ...prev.config.headers };
      delete newHeaders[key];
      return {
        ...prev,
        config: { ...prev.config, headers: newHeaders }
      };
    });
  };

  const addHeaderParam = () => {
    const key = prompt('Enter header parameter key:');
    const value = prompt('Enter header parameter type:');
    if (key && value) {
      setFormData(prev => ({
        ...prev,
        config: {
          ...prev.config,
          headerParams: { ...prev.config.headerParams, [key]: value }
        }
      }));
    }
  };

  const removeHeaderParam = (key: string) => {
    setFormData(prev => {
      const newHeaderParams = { ...prev.config.headerParams };
      delete newHeaderParams[key];
      return {
        ...prev,
        config: { ...prev.config, headerParams: newHeaderParams }
      };
    });
  };

  const addInputProperty = () => {
    const key = prompt('Enter input property key:');
    const type = prompt('Enter input property type:');
    if (key && type) {
      setFormData(prev => ({
        ...prev,
        inputProperties: { ...prev.inputProperties, [key]: type }
      }));
    }
  };

  const removeInputProperty = (key: string) => {
    setFormData(prev => {
      const newInputProperties = { ...prev.inputProperties };
      delete newInputProperties[key];
      return { ...prev, inputProperties: newInputProperties };
    });
  };

  const addOutputProperty = () => {
    const key = prompt('Enter output property key:');
    const type = prompt('Enter output property type:');
    if (key && type) {
      setFormData(prev => ({
        ...prev,
        outputProperties: { ...prev.outputProperties, [key]: type }
      }));
    }
  };

  const removeOutputProperty = (key: string) => {
    setFormData(prev => {
      const newOutputProperties = { ...prev.outputProperties };
      delete newOutputProperties[key];
      return { ...prev, outputProperties: newOutputProperties };
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading functions...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Functions</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchAllFunctions}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Add Function
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {isEditing && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="font-medium text-gray-900 mb-4">
            {editingFunction ? 'Edit Function' : 'Add New Function'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
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
                  <option value="API">API</option>
                  <option value="KAFKA">KAFKA</option>
                </select>
              </div>
            </div>

            {/* Configuration */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select
                    value={formData.config.httpMethod}
                    onChange={(e) => updateConfig('httpMethod', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                  <input
                    type="text"
                    value={formData.config.host}
                    onChange={(e) => updateConfig('host', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://api.example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
                  <input
                    type="text"
                    value={formData.config.path}
                    onChange={(e) => updateConfig('path', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="/api/v1/users"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  value={formData.config.timeoutMs}
                  onChange={(e) => updateConfig('timeoutMs', parseInt(e.target.value) || 30000)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1000"
                  max="300000"
                />
              </div>

              {/* Request Body for POST/PUT */}
              {(formData.config.httpMethod === 'POST' || formData.config.httpMethod === 'PUT') && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Request Body (JSON)</label>
                  <textarea
                    value={formData.config.requestBody || ''}
                    onChange={(e) => updateConfig('requestBody', e.target.value || null)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder='{"key": "value"}
Example: {"name":"NAME","dateOfBirth":"DOB","panNumber":"PAN"}'
                  />
                  {formData.config.requestBody && formData.config.requestBody.trim() && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-600">Preview:</span>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto border">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(formData.config.requestBody!), null, 2);
                          } catch (e) {
                            return formData.config.requestBody!;
                          }
                        })()}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Request Body Path */}
              {(formData.config.httpMethod === 'POST' || formData.config.httpMethod === 'PUT') && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">Request Body Path Mappings</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const key = prompt('Enter request body path key:');
                        const value = prompt('Enter JSON path (e.g., $.fieldName):');
                        if (key && value) {
                          setFormData(prev => ({
                            ...prev,
                            config: {
                              ...prev.config,
                              requestBodyPath: { ...prev.config.requestBodyPath, [key]: value }
                            }
                          }));
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + Add Path Mapping
                    </button>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(formData.config.requestBodyPath || {}).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <input
                          type="text"
                          value={key}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          placeholder="Parameter name"
                        />
                        <input
                          type="text"
                          value={value}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          placeholder="JSON path"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => {
                              const newRequestBodyPath = { ...prev.config.requestBodyPath };
                              delete newRequestBodyPath[key];
                              return {
                                ...prev,
                                config: { ...prev.config, requestBodyPath: newRequestBodyPath }
                              };
                            });
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Headers */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-900">Headers</h4>
                <button
                  type="button"
                  onClick={addHeader}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Header
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(formData.config.headers).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <input
                      type="text"
                      value={key}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <input
                      type="text"
                      value={value}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeader(key)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Header Parameters */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-900">Header Parameters</h4>
                <button
                  type="button"
                  onClick={addHeaderParam}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Parameter
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(formData.config.headerParams).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <input
                      type="text"
                      value={key}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <input
                      type="text"
                      value={value}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeaderParam(key)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Input/Output Properties */}
            <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">Input Properties</h4>
                  <button
                    type="button"
                    onClick={addInputProperty}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Input
                  </button>
                </div>
                <div className="space-y-2">
                  {Object.entries(formData.inputProperties).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <input
                        type="text"
                        value={key}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                      <input
                        type="text"
                        value={value}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
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
                  <h4 className="font-medium text-gray-900">Output Properties</h4>
                  <button
                    type="button"
                    onClick={addOutputProperty}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Output
                  </button>
                </div>
                <div className="space-y-2">
                  {Object.entries(formData.outputProperties).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <input
                        type="text"
                        value={key}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                      <input
                        type="text"
                        value={value}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
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

      {/* Function List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h3 className="font-medium text-gray-900">Function List ({displayedFunctions.length})</h3>
        </div>
        
        {displayedFunctions.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No functions available. Click "Add Function" to create one or "Refresh" to load from server.
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div><span className="font-medium">Method:</span> {fn.config.httpMethod}</div>
                        <div><span className="font-medium">Host:</span> {fn.config.host}</div>
                        <div><span className="font-medium">Path:</span> {fn.config.path}</div>
                      </div>
                      {fn.config.requestBody && fn.config.requestBody.trim() && (
                        <div className="mt-2">
                          <span className="font-medium">Request Body:</span>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto whitespace-pre-wrap">
                            {(() => {
                              try {
                                return JSON.stringify(JSON.parse(fn.config.requestBody!), null, 2);
                              } catch (e) {
                                return fn.config.requestBody!;
                              }
                            })()}
                          </pre>
                        </div>
                      )}
                      {Object.keys(fn.config.requestBodyPath || {}).length > 0 && (
                        <div className="mt-2">
                          <span className="font-medium">Request Body Mappings:</span>
                          <div className="text-xs mt-1">
                            {Object.entries(fn.config.requestBodyPath || {}).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-medium">{key}:</span>
                                <span>{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {Object.keys(fn.config.queryParams || {}).length > 0 && (
                        <div className="mt-2">
                          <span className="font-medium">Query Parameters:</span>
                          <div className="text-xs mt-1">
                            {Object.entries(fn.config.queryParams || {}).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-medium">{key}:</span>
                                <span>{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {Object.keys(fn.config.pathParams || {}).length > 0 && (
                        <div className="mt-2">
                          <span className="font-medium">Path Parameters:</span>
                          <div className="text-xs mt-1">
                            {Object.entries(fn.config.pathParams || {}).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-medium">{key}:</span>
                                <span>{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>Headers: {Object.keys(fn.config.headers || {}).length}</span>
                      <span>Header Params: {Object.keys(fn.config.headerParams || {}).length}</span>
                      <span>Query Params: {Object.keys(fn.config.queryParams || {}).length}</span>
                      <span>Path Params: {Object.keys(fn.config.pathParams || {}).length}</span>
                      <span>Inputs: {Object.keys(fn.inputProperties || {}).length}</span>
                      <span>Outputs: {Object.keys(fn.outputProperties || {}).length}</span>
                      <span>Timeout: {fn.config.timeoutMs}ms</span>
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