import React, { useEffect, useRef, useState } from 'react';
import { useJourney } from '../../context/JourneyContext';
import { Node } from '../../types/journey';
import { X, Settings, Link, Database, ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';

const PreviewTab: React.FC = () => {
  const { journey } = useJourney();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodePositions, setNodePositions] = useState<{ [key: string]: { x: number; y: number } }>({});
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  
  // Pan and zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (svgRef.current) {
      renderGraph();
    }
  }, [journey, transform]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(3, transform.scale * scaleFactor));
      
      // Zoom towards mouse position
      const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
      const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
      
      setTransform({ x: newX, y: newY, scale: newScale });
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.target === container || (e.target as Element).closest('.graph-background')) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setLastPanPoint({ x: transform.x, y: transform.y });
        container.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        setTransform(prev => ({
          ...prev,
          x: lastPanPoint.x + deltaX,
          y: lastPanPoint.y + deltaY
        }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      container.style.cursor = 'grab';
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, lastPanPoint, transform]);

  const renderGraph = () => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const baseWidth = 800;
    const baseHeight = 600;

    // Clear existing content
    svg.innerHTML = '';

    // Create definitions for arrowheads
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'strokeWidth');

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', '#374151');

    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Create main group for transformations
    const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    mainGroup.setAttribute('transform', `translate(${transform.x}, ${transform.y}) scale(${transform.scale})`);
    svg.appendChild(mainGroup);

    // Position nodes in a more spread out layout
    const nodes = journey.nodes.map((node, index) => {
      const cols = Math.max(3, Math.ceil(Math.sqrt(journey.nodes.length * 1.5)));
      const row = Math.floor(index / cols);
      const col = index % cols;
      const spacing = 150;
      const x = (col + 1) * spacing + 100;
      const y = (row + 1) * spacing + 100;
      
      return {
        ...node,
        x: typeof node.x === 'number' ? node.x : x,
        y: typeof node.y === 'number' ? node.y : y
      };
    });

    // Store node positions for click detection
    const positions: { [key: string]: { x: number; y: number } } = {};
    nodes.forEach(node => {
      positions[node.id] = { x: node.x, y: node.y };
    });
    setNodePositions(positions);

    // Draw edges
    const filteredEdges = journey.edges.filter(edge => {
      const fromNode = journey.nodes.find(n => n.id === edge.fromNodeId);
      const toNode = journey.nodes.find(n => n.id === edge.toNodeId);
      return fromNode && toNode && fromNode.type !== 'dead_end';
    });
    
    filteredEdges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.fromNodeId);
      const toNode = nodes.find(n => n.id === edge.toNodeId);
      
      if (fromNode && toNode) {
        // Calculate edge endpoints to stop at circle boundary
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = 35;
        
        const fromX = fromNode.x + (dx / distance) * radius;
        const fromY = fromNode.y + (dy / distance) * radius;
        const toX = toNode.x - (dx / distance) * radius;
        const toY = toNode.y - (dy / distance) * radius;

        // Draw line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromX.toString());
        line.setAttribute('y1', fromY.toString());
        line.setAttribute('x2', toX.toString());
        line.setAttribute('y2', toY.toString());
        line.setAttribute('stroke', '#374151');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        mainGroup.appendChild(line);

        // Add visual indicator for edges with conditions (small dot)
        if (edge.validationCondition && edge.validationCondition.trim()) {
          const midX = (fromX + toX) / 2;
          const midY = (fromY + toY) / 2;
        
          // Create a text label for the edge
          const edgeLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          edgeLabel.setAttribute('x', midX.toString());
          edgeLabel.setAttribute('y', (midY - 8).toString()); // Slightly above the edge
          edgeLabel.setAttribute('text-anchor', 'middle');
          edgeLabel.setAttribute('font-size', '10');
          edgeLabel.setAttribute('font-family', 'system-ui, sans-serif');
          edgeLabel.setAttribute('fill', '#FF0000');
          edgeLabel.setAttribute('stroke', '#FF0000');
          edgeLabel.setAttribute('stroke-width', '0.5');
          edgeLabel.setAttribute('cursor', 'pointer');
          edgeLabel.setAttribute('data-edge-id', edge.id);
        
          // Use edge.name, edge.label, or fallback to edge.id
          edgeLabel.textContent = edge.validationCondition || edge.id;
        
          mainGroup.appendChild(edgeLabel);
        }
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      // Node circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x.toString());
      circle.setAttribute('cy', node.y.toString());
      circle.setAttribute('r', '35');
      circle.setAttribute('fill', getNodeColor(node.type));
      circle.setAttribute('stroke', selectedNode?.id === node.id ? '#3B82F6' : '#374151');
      circle.setAttribute('stroke-width', selectedNode?.id === node.id ? '3' : '2');
      circle.setAttribute('cursor', 'pointer');
      circle.addEventListener('click', (e) => {
        e.stopPropagation();
        handleNodeClick(node);
      });
      mainGroup.appendChild(circle);

      // Node label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x.toString());
      text.setAttribute('y', (node.y + 5).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', '#1F2937');
      text.setAttribute('font-family', 'system-ui, sans-serif');
      text.setAttribute('cursor', 'pointer');
      text.textContent = node.name.length > 12 ? node.name.substring(0, 12) + '...' : node.name;
      text.addEventListener('click', (e) => {
        e.stopPropagation();
        handleNodeClick(node);
      });
      mainGroup.appendChild(text);

      // Properties count
      if (node.properties.length > 0) {
        const propText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        propText.setAttribute('x', node.x.toString());
        propText.setAttribute('y', (node.y + 45).toString());
        propText.setAttribute('text-anchor', 'middle');
        propText.setAttribute('font-size', '10');
        propText.setAttribute('fill', '#6B7280');
        propText.setAttribute('font-family', 'system-ui, sans-serif');
        propText.setAttribute('cursor', 'pointer');
        propText.textContent = `${node.properties.length} props`;
        propText.addEventListener('click', (e) => {
          e.stopPropagation();
          handleNodeClick(node);
        });
        mainGroup.appendChild(propText);
      }

      // Function mapping indicator
      const mapping = journey.mappings.find(m => m.nodeId === node.id);
      if (mapping) {
        const funcIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        funcIndicator.setAttribute('cx', (node.x + 20).toString());
        funcIndicator.setAttribute('cy', (node.y - 20).toString());
        funcIndicator.setAttribute('r', '8');
        funcIndicator.setAttribute('fill', '#8B5CF6');
        funcIndicator.setAttribute('stroke', '#FFFFFF');
        funcIndicator.setAttribute('stroke-width', '2');
        funcIndicator.setAttribute('cursor', 'pointer');
        funcIndicator.addEventListener('click', (e) => {
          e.stopPropagation();
          handleNodeClick(node);
        });
        mainGroup.appendChild(funcIndicator);

        const funcText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        funcText.setAttribute('x', (node.x + 20).toString());
        funcText.setAttribute('y', (node.y - 15).toString());
        funcText.setAttribute('text-anchor', 'middle');
        funcText.setAttribute('font-size', '10');
        funcText.setAttribute('font-weight', 'bold');
        funcText.setAttribute('fill', '#FFFFFF');
        funcText.setAttribute('font-family', 'system-ui, sans-serif');
        funcText.setAttribute('cursor', 'pointer');
        funcText.textContent = 'f';
        funcText.addEventListener('click', (e) => {
          e.stopPropagation();
          handleNodeClick(node);
        });
        mainGroup.appendChild(funcText);
      }
    });
  };

  const handleNodeClick = (node: Node) => {
    setSelectedNode(selectedNode?.id === node.id ? null : node);
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'dead_end':
        return '#EF4444';
      case 'input':
        return '#3B82F6';
      case 'loader':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const handleZoomIn = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(3, prev.scale * 1.2)
    }));
  };

  const handleZoomOut = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, prev.scale / 1.2)
    }));
  };

  const handleResetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  const getNodeProperties = (node: Node) => {
    return node.properties.map(propId => 
      journey.properties.find(p => p.id === propId)
    ).filter(Boolean);
  };

  const getNodeMappings = (node: Node) => {
    return journey.mappings.filter(m => m.nodeId === node.id);
  };

  const getNodeFunctions = (node: Node) => {
    const mappings = getNodeMappings(node);
    return mappings.map(mapping => 
      journey.functions.find(f => f.id === mapping.functionId)
    ).filter(Boolean);
  };

  const getConnectedEdges = (node: Node) => {
    return {
      incoming: journey.edges.filter(e => e.toNodeId === node.id),
      outgoing: journey.edges.filter(e => e.fromNodeId === node.id)
    };
  };

  return (
    <div>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Preview</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Nodes: {journey.nodes.length}</span>
            <span>Edges: {journey.edges.length}</span>
            <span>Functions: {journey.functions.length}</span>
            <span>Mappings: {journey.mappings.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-900">Journey Graph</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Input</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Loader</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Dead_End</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Function</span>
              </div>
            </div>
          </div>

          {/* Graph Controls */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomIn}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={handleResetView}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Reset View"
              >
                <RotateCcw size={16} />
              </button>
              <span className="text-sm text-gray-500 ml-2">
                Zoom: {Math.round(transform.scale * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Move size={16} />
              <span>Drag to pan • Scroll to zoom • Click nodes for details</span>
            </div>
          </div>

          <div 
            ref={containerRef}
            className="border rounded-lg overflow-hidden graph-background"
            style={{ 
              background: '#F9FAFB',
              cursor: isDragging ? 'grabbing' : 'grab',
              height: '500px',
              position: 'relative'
            }}
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              style={{ display: 'block' }}
            />
          </div>

          {journey.nodes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No nodes to display. Create some nodes to see the graph visualization.
            </div>
          )}

          {journey.nodes.length > 0 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Use mouse wheel to zoom, drag to pan, and click on nodes to view details
            </div>
          )}
        </div>
      </div>

      {/* Node Details Panel below the graph */}
      {selectedNode && (
        <div className="mt-8 bg-white rounded-lg border p-6 min-w-3xl mx-auto min-h-[600px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Node Details</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
              
              {/* Tooltip for edge conditions */}
              {tooltip.visible && (
                <div
                  className="absolute bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10 max-w-xs"
                  style={{
                    left: tooltip.x,
                    top: tooltip.y,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {tooltip.content}
                </div>
              )}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Settings size={16} className="text-gray-500" />
                <h4 className="font-medium text-gray-900">Node Information</h4>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between gap-2">
                  <div className='w-1/3'>
                    <span className="text-sm font-medium text-gray-700">Name:</span>
                    <span className="ml-2 text-sm text-gray-900">{selectedNode.name}</span>
                  </div>
                  <div className='w-1/3'>
                    <span className="text-sm font-medium text-gray-700">Type:</span>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {selectedNode.type}
                    </span>
                  </div>
                  <div className='flex gap-2 w-1/3'>
                    <span className="text-sm font-medium text-gray-700">Description:</span>
                    <p className="text-sm text-gray-900 break-words">{selectedNode.description ? selectedNode.description : 'No description'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Properties */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Database size={16} className="text-gray-500" />
                <h4 className="font-medium text-gray-900">Properties ({getNodeProperties(selectedNode).length})</h4>
              </div>
              <div className="space-y-2">
                {getNodeProperties(selectedNode).length > 0 ? (
                  getNodeProperties(selectedNode).map(property => (
                    <div key={property!.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-900">{property!.key}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                          {property!.type}
                        </span>
                      </div>
                      {property!.validationCondition && property!.validationCondition.trim() && (
                        <div className="text-xs text-gray-600">
                          <strong>Validation:</strong> {property!.validationCondition}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No properties attached</p>
                )}
              </div>
            </div>

            {/* Functions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Settings size={16} className="text-gray-500" />
                <h4 className="font-medium text-gray-900">Functions ({getNodeFunctions(selectedNode).length})</h4>
              </div>
              <div className="space-y-3">
                {getNodeFunctions(selectedNode).length > 0 ? (
                  getNodeFunctions(selectedNode).map((func, index) => {
                    const mapping = getNodeMappings(selectedNode)[index];
                    return (
                      <div key={func!.id} className="bg-purple-50 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-900">{func!.name}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                            {func!.type}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          <strong>{func!.config.httpMethod}</strong> {func!.config.host}{func!.config.path}
                        </div>
                        {mapping?.condition && mapping.condition.trim() && (
                          <div className="text-xs text-gray-600 mb-2">
                            <strong>Condition:</strong> {mapping.condition}
                          </div>
                        )}
                        <div className="flex gap-4 text-xs text-gray-500 mb-2">
                          <span>Inputs: {Object.keys(func!.inputProperties).length}</span>
                          <span>Outputs: {Object.keys(func!.outputProperties).length}</span>
                        </div>
                        {/* Input Properties */}
                        {Object.keys(func!.inputProperties).length > 0 && (
                          <div className="mb-2">
                            <div className="font-semibold text-xs text-gray-700">Input Properties:</div>
                            <ul className="ml-4 list-disc text-xs">
                              {Object.entries(func!.inputProperties).map(([key, type]) => (
                                <li key={key}><span className="font-medium">{key}</span>: {type}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {/* Output Properties */}
                        {Object.keys(func!.outputProperties).length > 0 && (
                          <div className="mb-2">
                            <div className="font-semibold text-xs text-gray-700">Output Properties:</div>
                            <ul className="ml-4 list-disc text-xs">
                              {Object.entries(func!.outputProperties).map(([key, type]) => (
                                <li key={key}><span className="font-medium">{key}</span>: {type}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {/* Variable Mappings */}
                        {(mapping && (mapping as any).variableMappings && (mapping as any).variableMappings.length > 0) && (
                          <div className="mb-2">
                            <div className="font-semibold text-xs text-gray-700">Variable Mappings:</div>
                            <ul className="ml-4 list-disc text-xs">
                              {(mapping as any).variableMappings.map((vm: any, idx: any) => (
                                <li key={vm.id || idx} className="mb-1">
                                  <div>
                                    <span className="font-medium">Source:</span> {vm.sourceVariableName} ({vm.sourceVariableType})<br/>
                                    <span className="font-medium">Target:</span> {vm.targetParameterName} ({vm.targetParameterType})<br/>
                                    <span className="font-medium">Mapping Type:</span> {vm.mappingType}, <span className="font-medium">Strategy:</span> {vm.strategy}<br/>
                                    <span className="font-medium">Expression:</span> {vm.sourceVariableExpression}<br/>
                                    <span className="font-medium">Mandatory:</span> {vm.mandatory ? 'Yes' : 'No'}<br/>
                                    {vm.transformationExpression && <><span className="font-medium">Transformation:</span> {vm.transformationExpression}<br/></>}
                                    {vm.defaultValue && <><span className="font-medium">Default:</span> {vm.defaultValue}</>}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 italic">No functions mapped</p>
                )}
              </div>
            </div>

            {/* Connections */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Link size={16} className="text-gray-500" />
                <h4 className="font-medium text-gray-900">Edges</h4>
              </div>
              <div className="space-y-3">
                {(() => {
                  const edges = getConnectedEdges(selectedNode);
                  return (
                    <>
                      {edges.incoming.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Incoming edges ({edges.incoming.length})</h5>
                          <div className="space-y-1">
                            {edges.incoming.map(edge => {
                              const fromNode = journey.nodes.find(n => n.id === edge.fromNodeId);
                              return (
                                <div key={edge.id} className="bg-green-50 rounded p-2 text-sm">
                                  <span className="font-medium">{fromNode?.name || 'Unknown'}</span>
                                  {edge.validationCondition && edge.validationCondition.trim() && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      Condition: {edge.validationCondition}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {edges.outgoing.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Outgoing edges ({edges.outgoing.length})</h5>
                          <div className="space-y-1">
                            {edges.outgoing.map(edge => {
                              const toNode = journey.nodes.find(n => n.id === edge.toNodeId);
                              return (
                                <div key={edge.id} className="bg-blue-50 rounded p-2 text-sm">
                                  <span className="font-medium">{toNode?.name || 'Unknown'}</span>
                                  {edge.validationCondition && edge.validationCondition.trim() && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      Condition: {edge.validationCondition}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {edges.incoming.length === 0 && edges.outgoing.length === 0 && (
                        <p className="text-sm text-gray-500 italic">No connections</p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewTab;