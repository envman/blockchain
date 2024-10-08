function init() {
  if (window.goSamples) goSamples();  // init for these samples -- you don't need to call this
  var $ = go.GraphObject.make;  // for conciseness in defining templates

  // The Diagram just shows what should be visible in the viewport.
  // Its model does NOT include node data for the whole graph, but only that
  // which might be visible in the viewport.
  myDiagram =
    $(go.Diagram, "myDiagramDiv",
      {
        initialContentAlignment: go.Spot.Center,
        layout: $(go.ForceDirectedLayout),
        // contentAlignment: go.Spot.Center,

        // use a virtualized ForceDirectedLayout which does not require
        // that the Nodes and Links exist first for an accurate layout
        // layout: $(VirtualizedForceDirectedLayout,
        //   { defaultSpringLength: 10, maxIterations: 15 }),

        // Define the template for Nodes, used by virtualization.
        nodeTemplate:
          $(go.Node, "Auto",
            { isLayoutPositioned: true },  // optimization
            new go.Binding("position", "bounds", function (b) { return b.position; })
              .makeTwoWay(function (p, d) { return new go.Rect(p.x, p.y, d.bounds.width, d.bounds.height); }),
            { width: 70, height: 20 },  // in cooperation with the load function, below
            $(go.Shape, "Rectangle",
              new go.Binding("fill", "color")),
            $(go.TextBlock,
              { margin: 2 },
              new go.Binding("text", "key")),
            {
              toolTip:
                $("ToolTip",
                  $(go.TextBlock, { margin: 3 },
                    new go.Binding("text", "",
                      function (d) { return "key: " + d.key + "\nbounds: " + d.bounds.toString(); }))
                )
            }
          ),

        // Define the template for Links
        linkTemplate:
          $(go.Link,
            { isLayoutPositioned: false },  // optimization
            $(go.Shape)
          ),

        "animationManager.isEnabled": false
      });

  // This model includes all of the data
  myWholeModel =
    $(go.GraphLinksModel);  // must match the model used by the Diagram, below

  // The virtualized layout works on the full model, not on the Diagram Nodes and Links
  myDiagram.layout.model = myWholeModel;

  // Do not set myDiagram.model = myWholeModel -- that would create a zillion Nodes and Links!
  // In the future Diagram may have built-in support for virtualization.
  // For now, we have to implement virtualization ourselves by having the Diagram's model
  // be different than the "real" model.
  myDiagram.model =   // this only holds nodes that should be in the viewport
    $(go.GraphLinksModel);  // must match the model, above

  // for now, we have to implement virtualization ourselves
  myDiagram.isVirtualized = true;
  myDiagram.addDiagramListener("ViewportBoundsChanged", onViewportChanged);

  // once the layout has finished we can decide where to position the viewport
  myDiagram.addDiagramListener("InitialLayoutCompleted", function (e) {
    var firstdata = myWholeModel.findNodeDataForKey(0);
    if (firstdata !== null) {
      myDiagram.centerRect(firstdata.bounds);
    }
  });

  myDiagram.model.nodeDataArray = [
    // { key: 'A', color: go.Brush.randomColor(), bounds: new go.Rect(0, 0, 70, 20) },
    // { key: 'B', color: go.Brush.randomColor(), bounds: new go.Rect(0, 0, 70, 20) },
  ]

  myDiagram.model.linkDataArray = [
    // { from: 'A', to: 'B' }
  ]

  // setTimeout(() => {
    
  // }, 2000)

  const has_link = (from, to) => {
    const found = myDiagram.findLinksByExample({
      from: from,
      to: to,
    })

    return !!found.ia
  }

  // myDiagram.delayInitialization(function () { spinDuring("mySpinner", load); });

  const colour_cache = {}

  const hash_colour = hash => {
    if (!colour_cache[hash]) {
      colour_cache[hash] = go.Brush.randomColor()
    }

    return colour_cache[hash]
  }

  const fetch_node = (node) => {
    const my_node = myDiagram.findNodeForKey(node.key)

    return fetch(`http://localhost:${node.web_port}/testing/info`)
      .then(r => r.json())
      .then(data => {
        myDiagram.commit(() => {
          myDiagram.model.setDataProperty(node, 'status', data.status)

          // console.log('head', data.head)
          myDiagram.model.setDataProperty(node, 'color', hash_colour(data.head))

          data.peers.map(x => {
            const other = myDiagram.findNodeForKey(x.id)

            if (!other) {
              return console.error(`cannot find`, x)
            }

            if (!has_link(my_node.key, other.key) && !has_link(other.key, my_node.key)) {
              myDiagram.model.addLinkData({
                from: my_node.key,
                to: other.key,
              })
            }
          })
        })
      })
      .catch(err => {
        myDiagram.remove(my_node)
        console.error(err)
        // TODO: remove node
      })
  }

  const poll = () => {
    fetch('http://localhost:7000/nodes')
      .then(r => r.json())
      .then(nodes => {
        Promise.all(nodes.map(({ id, web_port }) => {
          let node = myDiagram.findNodeForKey(id)

          if (!node) {
            // console.log('add node')
            myDiagram.model.addNodeData({
              key: id,
              web_port,
              status: 'Not Connected',
              color: go.Brush.randomColor(),
              bounds: new go.Rect(0, 0, 70, 20)
            })
          }

          node = myDiagram.findNodeForKey(id)

          return fetch_node(node.data)
          // TODO: clean up nodes?
        }))
      })
      .then(_ => setTimeout(poll, 500))
      .catch(err => {
        console.error(err)
        setTimeout(poll, 500)
      })
  }

  setTimeout(poll, 500)
}

// implement a wait spinner in HTML with CSS animation
function spinDuring(spinner, compute) {  // where compute is a function of zero args
  // show the animated spinner
  if (typeof spinner === "string") spinner = document.getElementById(spinner);
  if (spinner) {
    // position it in the middle of the viewport DIV
    var x = Math.floor(myDiagram.div.offsetWidth / 2 - spinner.naturalWidth / 2);
    var y = Math.floor(myDiagram.div.offsetHeight / 2 - spinner.naturalHeight / 2);
    spinner.style.left = x + "px";
    spinner.style.top = y + "px";
    spinner.style.display = "inline";
  }
  setTimeout(function () {
    try {
      compute();  // do the computation
    } finally {
      if (spinner) spinner.style.display = "none";
    }
  }, 20);
}

// function load() {
//   // create a lot of data for the myWholeModel
//   generateNodes(myWholeModel, 2345, 2345);
//   generateLinks(myWholeModel, 1, 5);
//   myDiagram.layoutDiagram(true);
// }

// Creates a random number of randomly colored nodes.
function generateNodes(model, min, max) {
  if (isNaN(min) || min < 0) min = 2;
  if (isNaN(max) || max < min) max = min;
  var nodeArray = [];
  var numNodes = Math.floor(Math.random() * (max - min + 1)) + min;
  for (var i = 0; i < numNodes; i++) {
    var d = {
      key: i,
      color: go.Brush.randomColor()  // the node's color
    };
    //!!!???@@@ this needs to be customized to account for your chosen Node template
    d.bounds = new go.Rect(0, 0, 70, 20);
    nodeArray.push(d);
  }
  model.nodeDataArray = nodeArray;
}

// Takes the random collection of nodes and creates a random tree with them.
// Respects the minimum and maximum number of links from each node.
// (The minimum can be disregarded if we run out of nodes to link to)
function generateLinks(model, min, max) {
  if (model.nodeDataArray.length < 2) return;
  if (isNaN(min) || min < 1) min = 1;
  if (isNaN(max) || max < min) max = min;
  var linkArray = [];
  // make two Lists of nodes to keep track of where links already exist
  var nodes = new go.List();
  nodes.addAll(model.nodeDataArray);
  var available = new go.List();
  available.addAll(nodes);
  for (var i = 0; i < nodes.length; i++) {
    var next = nodes.get(i);
    available.delete(next)
    var children = Math.floor(Math.random() * (max - min + 1)) + min;
    for (var j = 1; j <= children; j++) {
      if (available.length === 0) break;
      var to = available.get(0);
      available.delete(to);
      linkArray.push({
        from: next.key,
        to: to.key
      });
    }
  }
  model.linkDataArray = linkArray;
}

// The following functions implement virtualization of the Diagram
// Assume data.bounds is a Rect of the area occupied by the Node in document coordinates.

// The normal mechanism for determining the size of the document depends on all of the
// Nodes and Links existing, so we need to use a function that depends only on the model data.
function computeDocumentBounds(model) {
  var b = new go.Rect();
  var ndata = model.nodeDataArray;
  for (var i = 0; i < ndata.length; i++) {
    var d = ndata[i];
    if (!d.bounds) continue;
    if (i === 0) {
      b.set(d.bounds);
    } else {
      b.unionRect(d.bounds);
    }
  }
  return b;
}

// As the user scrolls or zooms, make sure the Parts (Nodes and Links) exist in the viewport.
function onViewportChanged(e) {
  var diagram = e.diagram;
  // make sure there are Nodes for each node data that is in the viewport
  // or that is connected to such a Node
  var viewb = diagram.viewportBounds;  // the new viewportBounds
  var model = diagram.model;

  var oldskips = diagram.skipsUndoManager;
  diagram.skipsUndoManager = true;

  var b = new go.Rect();
  var ndata = myWholeModel.nodeDataArray;
  for (var i = 0; i < ndata.length; i++) {
    var n = ndata[i];
    if (!n.bounds) continue;
    if (n.bounds.intersectsRect(viewb)) {
      model.addNodeData(n);
    }
    if (model instanceof go.TreeModel) {
      // make sure links to all parent nodes appear
      var parentkey = myWholeModel.getParentKeyForNodeData(n);
      var parent = myWholeModel.findNodeDataForKey(parentkey);
      if (parent !== null) {
        if (n.bounds.intersectsRect(viewb)) {  // N is inside viewport
          model.addNodeData(parent);  // so that link to parent appears
          var node = diagram.findNodeForData(n);
          if (node !== null) {
            var link = node.findTreeParentLink();
            if (link !== null) {
              // do this now to avoid delayed routing outside of transaction
              link.fromNode.ensureBounds();
              link.toNode.ensureBounds();
              link.updateRoute();
            }
          }
        } else {  // N is outside of viewport
          // see if there's a parent that is in the viewport,
          // or if the link might cross over the viewport
          b.set(n.bounds);
          b.unionRect(parent.bounds);
          if (b.intersectsRect(viewb)) {
            model.addNodeData(n);  // add N so that link to parent appears
            var child = diagram.findNodeForData(n);
            if (child !== null) {
              var link = child.findTreeParentLink();
              if (link !== null) {
                // do this now to avoid delayed routing outside of transaction
                link.fromNode.ensureBounds();
                link.toNode.ensureBounds();
                link.updateRoute();
              }
            }
          }
        }
      }
    }
  }

  if (model instanceof go.GraphLinksModel) {
    var ldata = myWholeModel.linkDataArray;
    for (var i = 0; i < ldata.length; i++) {
      var l = ldata[i];
      var fromkey = myWholeModel.getFromKeyForLinkData(l);
      if (fromkey === undefined) continue;
      var from = myWholeModel.findNodeDataForKey(fromkey);
      if (from === null || !from.bounds) continue;

      var tokey = myWholeModel.getToKeyForLinkData(l);
      if (tokey === undefined) continue;
      var to = myWholeModel.findNodeDataForKey(tokey);
      if (to === null || !to.bounds) continue;

      b.set(from.bounds);
      b.unionRect(to.bounds);
      if (b.intersectsRect(viewb)) {
        // also make sure both connected nodes are present,
        // so that link routing is authentic
        model.addNodeData(from);
        model.addNodeData(to);
        model.addLinkData(l);
        var link = diagram.findLinkForData(l);
        if (link !== null) {
          // do this now to avoid delayed routing outside of transaction
          link.fromNode.ensureBounds();
          link.toNode.ensureBounds();
          link.updateRoute();
        }
      }
    }
  }

  diagram.skipsUndoManager = oldskips;

  if (myRemoveTimer === null) {
    // only remove offscreen nodes after a delay
    myRemoveTimer = setTimeout(function () { removeOffscreen(diagram); }, 3000);
  }

  updateCounts();  // only for this sample
}

// occasionally remove Parts that are offscreen from the Diagram
var myRemoveTimer = null;

function removeOffscreen(diagram) {
  myRemoveTimer = null;

  var viewb = diagram.viewportBounds;
  var model = diagram.model;
  var remove = [];  // collect for later removal
  var removeLinks = new go.Set();  // links connected to a node data to remove
  var it = diagram.nodes;
  while (it.next()) {
    var n = it.value;
    var d = n.data;
    if (d === null) continue;
    if (!n.actualBounds.intersectsRect(viewb) && !n.isSelected) {
      // even if the node is out of the viewport, keep it if it is selected or
      // if any link connecting with the node is still in the viewport
      if (!n.linksConnected.any(function (l) { return l.actualBounds.intersectsRect(viewb); })) {
        remove.push(d);
        if (model instanceof go.GraphLinksModel) {
          removeLinks.addAll(n.linksConnected);
        }
      }
    }
  }

  if (remove.length > 0) {
    var oldskips = diagram.skipsUndoManager;
    diagram.skipsUndoManager = true;
    model.removeNodeDataCollection(remove);
    if (model instanceof go.GraphLinksModel) {
      removeLinks.each(function (l) { if (!l.isSelected) model.removeLinkData(l.data); });
    }
    diagram.skipsUndoManager = oldskips;
  }

  updateCounts();  // only for this sample
}
// end of virtualized Diagram


// start of VirtualizedForceDirected[Layout/Network] classes

// Here we try to replace the dependence of ForceDirectedLayout on Nodes
// with depending only on the data in the GraphLinksModel.
function VirtualizedForceDirectedLayout() {
  go.ForceDirectedLayout.call(this);
  this.isOngoing = false;
  this.model = null;  // add this property for holding the whole GraphLinksModel
}
go.Diagram.inherit(VirtualizedForceDirectedLayout, go.ForceDirectedLayout);

VirtualizedForceDirectedLayout.prototype.createNetwork = function () {
  return new VirtualizedForceDirectedNetwork(this);  // defined below
};

// ignore the argument, an (implicit) collection of Parts
VirtualizedForceDirectedLayout.prototype.makeNetwork = function (coll) {
  var net = this.createNetwork();
  net.addData(this.model);  // use the model data, not any actual Nodes and Links
  return net;
};

VirtualizedForceDirectedLayout.prototype.commitLayout = function () {
  go.ForceDirectedLayout.prototype.commitLayout.call(this);
  // can't depend on regular bounds computation that depends on all Nodes existing
  this.diagram.fixedBounds = computeDocumentBounds(this.model);
  // update the positions of any existing Nodes
  this.diagram.nodes.each(function (node) {
    node.updateTargetBindings();
  });
};
// end VirtualizedForceDirectedLayout class

function VirtualizedForceDirectedNetwork(layout) {
  go.ForceDirectedNetwork.call(this, layout);
}
go.Diagram.inherit(VirtualizedForceDirectedNetwork, go.ForceDirectedNetwork);

VirtualizedForceDirectedNetwork.prototype.addData = function (model) {
  if (model instanceof go.GraphLinksModel) {
    var dataVertexMap = new go.Map();
    // create a vertex for each node data
    var ndata = model.nodeDataArray;
    for (var i = 0; i < ndata.length; i++) {
      var d = ndata[i];
      var v = this.createVertex();
      v.data = d;  // associate this Vertex with data, not a Node
      dataVertexMap.set(model.getKeyForNodeData(d), v);
      this.addVertex(v);
    }
    // create an edge for each link data
    var ldata = model.linkDataArray;
    for (var i = 0; i < ldata.length; i++) {
      var d = ldata[i];
      // now find corresponding vertexes
      var from = dataVertexMap.get(model.getFromKeyForLinkData(d));
      var to = dataVertexMap.get(model.getToKeyForLinkData(d));
      if (from === null || to === null) continue;  // skip
      // create and add VirtualizedForceDirectedEdge
      var e = this.createEdge();
      e.data = d;  // associate this Edge with data, not a Link
      e.fromVertex = from;
      e.toVertex = to;
      this.addEdge(e);
    }
  } else {
    throw new Error("can only handle GraphLinksModel data");
  }
};

VirtualizedForceDirectedNetwork.prototype.deleteArtificialVertexes = function () { };
// end VirtualizedForceDirectedNetwork class

// end of VirtualizedForceDirected[Layout/Network] classes

// This function is only used in this sample to demonstrate the effects of the virtualization.
// In a real application you would delete this function and all calls to it.
function updateCounts() {
  // document.getElementById("myMessage1").textContent = myWholeModel.nodeDataArray.length;
  // document.getElementById("myMessage2").textContent = myDiagram.nodes.count;
  // document.getElementById("myMessage3").textContent = myWholeModel.linkDataArray.length;
  // document.getElementById("myMessage4").textContent = myDiagram.links.count;
}
