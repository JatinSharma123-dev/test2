import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useJourney } from '../../context/JourneyContext';
import { Node } from '../../types/journey';

const NodesTab: React.FC = () => {
  const { journey, addNode, updateNode, deleteNode } = useJourney();
  const [isEditing, setIsEditing] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    properties: [] as string[]
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      description: '',
      properties: []
    });
    setIsEditing(false);
    setEditingNode(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Node name is required');
      return;
    }
    
    if (!formData.type) {
      alert('Node type is required');
      return;
    }
    
    if (editingNode) {
      updateNode(editingNode.id, formData);
    } else {
      addNode(formData);
    }
    
    resetForm();
  };

  const handleEdit = (node: Node) => {
    setEditingNode(node);
    setFormData({
      name: node.name,
      type: node.type,
      description: node.description,
      properties: node.properties
    });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this node? This will also remove all associated edges and mappings.')) {
      deleteNode(id);
    }
  };

  const handlePropertyToggle = (propertyId: string) => {
    setFormData(prev => ({
      ...prev,
      properties: prev.properties.includes(propertyId)
        ? prev.properties.filter(id => id !== propertyId)
        : [...prev.properties, propertyId]
    }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Nodes</h2>
        <button
          onClick={() => setIsEditing(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Add Node
        </button>
      </div>

      {isEditing && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-gray-900 mb-4">
            {editingNode ? 'Edit Node' : 'Add New Node'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="e.g., User Registration"
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
                  <option value="dead_end">DEAD_END</option>
                  <option value="input">INPUT</option>
                  <option value="loader">LOADER</option>
                </select>
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe what this node does..."
              />
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attach Properties
              </label>
              {journey.properties.length === 0 ? (
                <p className="text-gray-500 text-sm">No properties available. Create properties first.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {journey.properties.map((property) => (
                    <label key={property.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.properties.includes(property.id)}
                        onChange={() => handlePropertyToggle(property.id)}
                        className="mr-2"
                      />
                      <span className="text-sm">{property.key}</span>
                    </label>
                  ))}
                </div>
              )}
            </div> */}

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Save size={16} />
                {editingNode ? 'Update' : 'Add'} Node
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

      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h3 className="font-medium text-gray-900">Node List</h3>
        </div>
        
        {journey.nodes.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No nodes created yet. Click "Add Node" to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {journey.nodes.map((node,idx) => (
              <div key={idx} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">{node.name}</h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {node.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{node.description}</p>
                    {/* {node.properties.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {node.properties.map((propertyId) => {
                          const property = journey.properties.find(p => p.id === propertyId);
                          return property ? (
                            <span key={propertyId} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                              {property.key}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )} */}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(node)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(node.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                      disabled={node.type === 'start' || node.type === 'end'}
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

export default NodesTab;