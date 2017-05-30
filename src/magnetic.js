import constant from './constant';
import {quadtree} from 'd3-quadtree';

export default function() {
    let nodes = [],
        links = [],
        id = (node => node.index),              // accessor: node unique id
        charge = (node => 100),                 // accessor: number (equivalent to node mass)
        strength = (link => 1),                 // accessor: 0 <= number <= 1 (equivalent to G constant)
        theta = 0.9;

    function force(alpha) {
        if (links.length) { // Pre-set node pairs
            for (let i = 0; i < links.length; i++) {
                const link = nodeLinks[i],
                    dx = link.target.x - link.source.x,
                    dy = link.target.y - link.source.y,
                    d = distance(dx, dy);

                if (d === 0) continue;

                // Intensity falls quadratically with distance
                const relStrength = alpha * strength(link) / (d*d);
                const sourceRelAcceleration = charge(link.target) * relStrength / d;
                const targetRelAcceleration = charge(link.source) * relStrength / d;

                link.source.vx += dx * sourceRelAcceleration;
                link.source.vy += dy * sourceRelAcceleration;
                link.target.vx += dx * targetRelAcceleration;
                link.target.vy += dy * targetRelAcceleration;
            }
        } else { // Assume full node mesh if no links specified
            const tree = quadtree(nodes, d=>d.x, d=>d.y)
                .visitAfter(quadAccumulate);

            const etherStrength = alpha * strength();

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                tree.visit((quad, x1, _, x2) => {
                    if (!quad.value) return true;

                    var dx = quad.x - node.x,
                        dy = quad.y - node.y,
                        d = distance(dx, dy);

                    // Apply the Barnes-Hut approximation if possible.
                    if ((x2-x1) / d < theta) {
                        if (d > 0) {
                            const relAcceleration = quad.value * etherStrength / (d*d) / d;
                            node.vx += dx * relAcceleration;
                            node.vy += dy * relAcceleration;
                        }
                        return true;
                    }

                    // Otherwise, process points directly.
                    else if (quad.length || d === 0) return;

                    do if (quad.data !== node) {
                        const relAcceleration = charge(quad.data) * etherStrength / (d*d) / d;
                        node.vx += dx * relAcceleration;
                        node.vy += dy * relAcceleration;
                    } while (quad = quad.next);
                });
            }
        }

        //

        function quadAccumulate(quad) {
            var localCharge = 0, q, c, x, y, i;

            // For internal nodes, accumulate forces from child quadrants.
            if (quad.length) {
                for (x = y = i = 0; i < 4; ++i) {
                    if ((q = quad[i]) && (c = q.value)) {
                        localCharge += c, x += c * q.x, y += c * q.y;
                    }
                }
                quad.x = x / localCharge;
                quad.y = y / localCharge;
            }

            // For leaf nodes, accumulate forces from coincident quadrants.
            else {
                q = quad;
                q.x = q.data.x;
                q.y = q.data.y;
                do localCharge += charge(q.data);
                while (q = q.next);
            }

            quad.value = localCharge;
        }

        function distance(x, y) {
            return Math.sqrt(x*x + y*y);
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

    force.initialize = function(_) {
        nodes = _;
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

    // Barnes-Hut approximation tetha threshold (for full-mesh mode)
    force.theta = function(_) {
        return arguments.length ? (theta = _, force) : theta;
    };

    return force;
}