import constant from './constant';
import {quadtree} from 'd3-quadtree';

export default function() {
    let nodes = [],
        links = [],
        id = (node => node.index),              // accessor: node unique id
        charge = (node => 100),                 // accessor: number (equivalent to node mass)
        strength = (link => 1),                 // accessor: number (equivalent to G constant)
        polarity = ((q1, q2) => null),          // boolean or null (asymmetrical)
        distanceWeight = (d => 1/(d*d)),        // Intensity falls with the square of the distance (inverse-square law)
        theta = 0.9;

    function force(alpha) {
        if (links.length) { // Pre-set node pairs
            for (let i = 0; i < links.length; i++) {
                const link = links[i],
                    dx = link.target.x - link.source.x,
                    dy = link.target.y - link.source.y,
                    d = distance(dx, dy);

                if (d === 0) continue;

                const relStrength = alpha * strength(link) * distanceWeight(d);

                const qSrc = charge(link.source),
                    qTgt = charge(link.target);

                // Set attract/repel polarity
                const linkPolarity = polarity(qSrc, qTgt);

                const sourceAcceleration = signedCharge(qSrc, linkPolarity) * relStrength;
                const targetAcceleration = signedCharge(qTgt, linkPolarity) * relStrength;

                link.source.vx += dx/d * sourceAcceleration;
                link.source.vy += dy/d * sourceAcceleration;
                link.target.vx += dx/d * targetAcceleration;
                link.target.vy += dy/d * targetAcceleration;
            }
        } else { // Assume full node mesh if no links specified
            const tree = quadtree(nodes, d=>d.x, d=>d.y)
                .visitAfter(quadAccumulate);

            const etherStrength = alpha * strength();

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i],
                    nodeQ = charge(node);
                tree.visit((quad, x1, _, x2) => {
                    if (!quad.value) return true;

                    const dx = quad.x - node.x,
                        dy = quad.y - node.y,
                        d = distance(dx, dy);

                    // Apply the Barnes-Hut approximation if possible.
                    if ((x2-x1) / d < theta) {
                        if (d > 0) {
                            const otherQ = quad.value,
                                acceleration = signedCharge(otherQ, polarity(nodeQ, otherQ)) * etherStrength * distanceWeight(d);
                            node.vx += dx/d * acceleration;
                            node.vy += dy/d * acceleration;
                        }
                        return true;
                    }

                    // Otherwise, process points directly.
                    else if (quad.length || d === 0) return;

                    do if (quad.data !== node) {
                        const otherQ = charge(quad.data),
                            acceleration = signedCharge(otherQ, polarity(nodeQ, otherQ)) * etherStrength * distanceWeight(d);
                        node.vx += dx/d * acceleration;
                        node.vy += dy/d * acceleration;
                    } while (quad = quad.next);
                });
            }
        }

        //

        function quadAccumulate(quad) {
            var localCharge = 0, q, c, sumC = 0, x, y, i;

            // For internal nodes, accumulate forces from child quadrants.
            if (quad.length) {
                for (x = y = i = 0; i < 4; ++i) {
                    if ((q = quad[i]) && (c = Math.abs(q.value))) {
                        localCharge += q.value, sumC += c, x += c * q.x, y += c * q.y;
                    }
                }
                quad.x = x / sumC;
                quad.y = y / sumC;
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

        function signedCharge(q, polarity) {
            if (polarity === null) return q; // No change with null polarity
            return Math.abs(q) * (polarity ? 1 : -1);
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

    // How force direction is determined (whether nodes should attract each other (boolean), or asymmetrical based on opposite node's charge sign (null))
    force.polarity = function(_) {
        return arguments.length ? (polarity = typeof _ === "function" ? _ : constant(+_), force) : polarity;
    };

    // How the force intensity relates to the distance between nodes
    force.distanceWeight = function(_) {
        return arguments.length ? (distanceWeight = typeof _ === "function" ? _ : constant(+_), force) : distanceWeight;
    };

    // Barnes-Hut approximation tetha threshold (for full-mesh mode)
    force.theta = function(_) {
        return arguments.length ? (theta = _, force) : theta;
    };

    return force;
}