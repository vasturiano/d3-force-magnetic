import constant from './constant';
import {binarytree} from 'd3-binarytree';
import {quadtree} from 'd3-quadtree';
import {octree} from 'd3-octree';

export default function() {
  let nDim,
    nodes = [],
    links = [],
    id = (node => node.index),        // accessor: node unique id
    charge = (node => 100),         // accessor: number (equivalent to node mass)
    strength = (link => 1),         // accessor: number (equivalent to G constant)
    polarity = ((q1, q2) => null),      // boolean or null (asymmetrical)
    distanceWeight = (d => 1/(d*d)),    // Intensity falls with the square of the distance (inverse-square law)
    theta = 0.9;

  function force(alpha) {
    if (links.length) { // Pre-set node pairs
      for (let i = 0; i < links.length; i++) {
        const link = links[i],
          dx = link.target.x - link.source.x,
          dy = (link.target.y - link.source.y) || 0,
          dz = (link.target.z - link.target.z) || 0,
          d = distance(dx, dy, dz);

        if (d === 0) continue;

        const relStrength = alpha * strength(link) * distanceWeight(d);

        const qSrc = charge(link.source),
          qTgt = charge(link.target);

        // Set attract/repel polarity
        const linkPolarity = polarity(qSrc, qTgt);

        const sourceAcceleration = signedCharge(qTgt, linkPolarity) * relStrength;
        const targetAcceleration = signedCharge(qSrc, linkPolarity) * relStrength;

        link.source.vx += dx / d * sourceAcceleration;
        link.target.vx -= dx / d * targetAcceleration;
        if (nDim > 1) {
          link.source.vy += dy / d * sourceAcceleration;
          link.target.vy -= dy / d * targetAcceleration;
        }
        if (nDim > 2) {
          link.source.vz += dz / d * sourceAcceleration;
          link.target.vz -= dz / d * targetAcceleration;
        }
      }
    } else { // Assume full node mesh if no links specified
      const tree =
          (nDim === 1 ? binarytree(nodes, d => d.x)
          :(nDim === 2 ? quadtree(nodes, d => d.x, d => d.y)
          :(nDim === 3 ? octree(nodes, d => d.x, d => d.y, d => d.z)
          :null
        ))).visitAfter(accumulate);

      const etherStrength = alpha * strength();

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i],
          nodeQ = charge(node);
        tree.visit((treeNode, x1, arg1, arg2, arg3) => {
          if (!treeNode.value) return true;
          const x2 = [arg1, arg2, arg3][nDim-1];

          const dx = treeNode.x - node.x,
            dy = (treeNode.y - node.y) || 0,
            dz = (treeNode.z - node.z) || 0,
            d = distance(dx, dy, dz);

          // Apply the Barnes-Hut approximation if possible.
          if ((x2-x1) / d < theta) {
            if (d > 0) {
              applyAcceleration();
            }
            return true;
          }

          // Otherwise, process points directly.
          else if (treeNode.length || d === 0) return;

          do if (treeNode.data !== node) {
            applyAcceleration();
          } while (treeNode = treeNode.next);

          //

          function applyAcceleration() {
            const acceleration = signedCharge(treeNode.value, polarity(nodeQ, treeNode.value)) * etherStrength * distanceWeight(d);
            node.vx += dx/d * acceleration;
            if (nDim > 1) { node.vy += dy/d * acceleration; }
            if (nDim > 2) { node.vz += dz/d * acceleration; }
          }
        });
      }
    }

    //

    function accumulate(treeNode) {
      let localCharge = 0, q, c, weight = 0, x, y, z, i;

      // For internal nodes, accumulate forces from child tree-nodes (segments/quadrants/octants).
      if (treeNode.length) {
        for (x = y = z = i = 0; i < (2 ** nDim); ++i) {
          if ((q = treeNode[i]) && (c = Math.abs(q.value))) {
            localCharge += q.value, weight += c, x += c * (q.x || 0), y += c * (q.y || 0), z += c * (q.z || 0);
          }
        }
        treeNode.x = x / weight;
        if (nDim > 1) { treeNode.y = y / weight; }
        if (nDim > 2) { treeNode.z = z / weight; }
      }

      // For leaf nodes, accumulate forces from coincident tree nodes.
      else {
        q = treeNode;
        q.x = q.data.x;
        if (nDim > 1) { q.y = q.data.y; }
        if (nDim > 2) { q.z = q.data.z; }
        do localCharge += charge(q.data);
        while (q = q.next);
      }

      treeNode.value = localCharge;
    }

    function signedCharge(q, polarity) {
      if (polarity === null) return q; // No change with null polarity
      return Math.abs(q) * (polarity ? 1 : -1);
    }

    function distance(x, y, z) {
      return Math.sqrt(x*x + y*y + z*z);
    }
  }

  function initialize() {
    const nodesById = {};
    nodes.forEach(node => {
      nodesById[id(node)] = node;
    });

    links.forEach(link => {
      if (typeof link.source !== "object") link.source = nodesById[link.source] || link.source;
      if (typeof link.target !== "object") link.target = nodesById[link.target] || link.target;
    });
  }

  force.initialize = function(initNodes, numDimensions = 2) {
    nodes = initNodes;
    nDim = numDimensions;
    initialize();
  };

  force.links = function(_) {
    return arguments.length ? (links = _, initialize(), force) : links;
  };

  // Node id
  force.id = function(_) {
    return arguments.length ? (id = _, force) : id;
  };

  // Node capacity to attract (positive) or repel (negative)
  force.charge = function(_) {
    return arguments.length ? (charge = typeof _ === "function" ? _ : constant(+_), force) : charge;
  };

  // Link strength (ability of the medium to propagate charges)
  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), force) : strength;
  };

  // How force direction is determined (whether nodes should attract each other (boolean), or asymmetrical based on opposite node's charge sign (null))
  force.polarity = function(_) {
    return arguments.length ? (polarity = typeof _ === "function" ? _ : constant(+_), force) : polarity;
  };

  // How the force intensity relates to the distance between nodes
  force.distanceWeight = function(_) {
    return arguments.length ? (distanceWeight = _, force) : distanceWeight;
  };

  // Barnes-Hut approximation tetha threshold (for full-mesh mode)
  force.theta = function(_) {
    return arguments.length ? (theta = _, force) : theta;
  };

  return force;
}