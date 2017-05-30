import constant from './constant';
import {quadtree} from 'd3-quadtree';

export default function() {
    let nodes = [],
        links = [],
        id = (node => node.index),              // accessor: node unique id
        charge = (node => 100),                 // accessor: number (equivalent to node mass)
        strength = (link => 1),                 // accessor: 0 <= number <= 1 (equivalent to G constant)
        maxDistance = Infinity,
        theta = 0.9;

    function force(alpha) {
        if (links.length) { // Pre-set node pairs
            for (let i = 0; i < links.length; i++) {
                const link = nodeLinks[i],
                    dx = link.target.x - link.source.x,
                    dy = link.target.y - link.source.y,
                    d = distance(dx, dy);

                if (d === 0 || d > maxDistance) continue;

                // Intensity falls quadratically with distance
                const relStrength = alpha * strength(link) / (d * d);
                const a = distAngle(dx, dy);
                const sourceAcceleration = polar2Cart(charge(link.target) * relStrength, a);
                const targetAcceleration = polar2Cart(charge(link.source) * relStrength, a + Math.PI);

                link.source.vx += sourceAcceleration.x;
                link.source.vy += sourceAcceleration.y;
                link.target.vx += targetAcceleration.x;
                link.target.vy += targetAcceleration.y;
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
                        if (d > 0 && d <= maxDistance) {
                            const acceleration = polar2Cart(
                                quad.value * etherStrength / (d*d),
                                distAngle(dx, dy)
                            );

                            node.vx += acceleration.x;
                            node.vy += acceleration.y;
                        }
                        return true;
                    }

                    // Otherwise, process points directly.
                    else if (quad.length || d === 0 || d > maxDistance) return;

                    do if (quad.data !== node) {
                        const acceleration = polar2Cart(
                            charge(quad.data) * etherStrength / (d*d),
                            distAngle(dx, dy)
                        );

                        node.vx += acceleration.x;
                        node.vy += acceleration.y;
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

        function distAngle(x, y) {
            x = x||0; // Normalize -0 to 0 to avoid -Infinity issues in atan
            return (x === 0 && y === 0) ? 0 : Math.atan(y/x) + (x<0 ? Math.PI : 0); // Add PI for coords in 2nd & 3rd quadrants
        }

        function polar2Cart(d, a) {
            return {
                x: d * Math.cos(a),
                y: d * Math.sin(a)
            }
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

    // max distance for force to act (saves computation for far-away nodes)
    force.maxDistance = function(_) {
        return arguments.length ? (maxDistance = _, force) : maxDistance;
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