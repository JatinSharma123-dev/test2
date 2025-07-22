import React, { useState } from "react";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useJourney } from "../../context/JourneyContext";
import { Edge } from "../../types/journey";

const EdgesTab: React.FC = () => {
  const { journey, addEdge, updateEdge, deleteEdge } = useJourney();
  const [isEditing, setIsEditing] = useState(false);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
  const [formData, setFormData] = useState({
    fromNodeId: "",
    toNodeId: "",
    validationCondition: "",
  });

  const resetForm = () => {
    setFormData({
      fromNodeId: "",
      toNodeId: "",
      validationCondition: "",
    });
    setIsEditing(false);
    setEditingEdge(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fromNodeId || !formData.toNodeId) {
      alert('Both source and target nodes are required');
      return;
    }
    
    if (formData.fromNodeId === formData.toNodeId) {
      alert('Source and target nodes cannot be the same');
      return;
    }
    
    // Check for duplicate edges
    const existingEdge = journey.edges.find(edge => 
      edge.fromNodeId === formData.fromNodeId && 
      edge.toNodeId === formData.toNodeId &&
      (!editingEdge || edge.id !== editingEdge.id)
    );
    
    if (existingEdge) {
      alert('An edge between these nodes already exists');
      return;
    }

    if (editingEdge) {
      updateEdge(editingEdge.id, formData);
    } else {
      addEdge(formData);
    }

    resetForm();
  };

  const handleEdit = (edge: Edge) => {
    setEditingEdge(edge);
    setFormData({
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      validationCondition: edge.validationCondition,
    });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this edge?')) {
      deleteEdge(id);
    }
  };

  const getNodeName = (nodeId: string) => {
    const node = journey.nodes.find((n) => n.id === nodeId);
    return node ? node.name : "Unknown Node";
  };

  const availableNodes = journey.nodes.filter(
    (node) => node.type !== "start" && node.type !== "end"
  );
  const fromNodes = journey.nodes;
  const toNodes = journey.nodes;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Edges</h2>
        <button
          onClick={() => setIsEditing(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Add Edge
        </button>
      </div>

      {isEditing && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-gray-900 mb-4">
            {editingEdge ? "Edit Edge" : "Add New Edge"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Node *
                </label>
                <select
                  value={formData.fromNodeId}
                  onChange={(e) =>
                    setFormData({ ...formData, fromNodeId: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select source node...</option>
                  {fromNodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.name} ({node.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Node *
                </label>
                <select
                  value={formData.toNodeId}
                  onChange={(e) =>
                    setFormData({ ...formData, toNodeId: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select target node...</option>
                  {journey.nodes.map((node) =>
                    node.id !== formData.fromNodeId ? (
                      <option key={node.id} value={node.id}>
                        {node.name} ({node.type})
                      </option>
                    ) : null
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Validation Condition
              </label>
              <input
                type="text"
                value={formData.validationCondition}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    validationCondition: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., user.age >= 18, status === 'approved'"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Save size={16} />
                {editingEdge ? "Update" : "Add"} Edge
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
          <h3 className="font-medium text-gray-900">Edge List</h3>
        </div>

        {journey.edges.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No edges created yet. Click "Add Edge" to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {journey.edges.map((edge) => (
              <div key={edge.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          <span className="text-sm text-gray-600">From Node :</span> {getNodeName(edge.fromNodeId)}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-gray-900">
                          <span className="text-sm text-gray-600">To Node :</span>{getNodeName(edge.toNodeId)}
                        </span>
                      </div>
                    </div>
                    {edge.validationCondition && (
                      <div className="text-sm text-gray-600">
                        <strong>Condition:</strong> {edge.validationCondition}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(edge)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(edge.id)}
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

      {journey.nodes.length < 2 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <p className="text-yellow-800 text-sm">
            You need at least 2 nodes to create edges. Go to the Nodes tab to
            add more nodes.
          </p>
        </div>
      )}
    </div>
  );
};

export default EdgesTab;
