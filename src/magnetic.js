import constant from './constant';

export default function() {
    let nodes = [],
        links = [],
        fullMeshLinks = [],
        id = (node => node.index),              // accessor: node unique id
        charge = (node => 100),                   // accessor: number (equivalent to node mass)
        strength = (link => 1),                 // accessor: 0 <= number <= 1 (equivalent to G constant)
        maxDistance = Infinity;

    function force(alpha) {
        const nodeLinks = links.length ? links : fullMeshLinks; // Assume full node mesh if no links specified

        for (let i=0; i < nodeLinks.length; i++) {
            const link = nodeLinks[i],
                dx = link.target.x-link.source.x,
                dy = link.target.y-link.source.y,
                d = distance(dx, dy);

            if (d === 0 || d > maxDistance) continue;

            // Intensity falls quadratically with distance
            const relStrength = alpha * strength(link) / (d*d);
            const a = distAngle(dx, dy);
            const sourceAcceleration = polar2Cart(charge(link.target) * relStrength, a);
            const targetAcceleration = polar2Cart(charge(link.source) * relStrength, a + Math.PI);

            link.source.vx += sourceAcceleration.x;
            link.source.vy += sourceAcceleration.y;
            link.target.vx += targetAcceleration.x;
            link.target.vy += targetAcceleration.y;
        }

        //

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

        // Reset full-mesh links
        fullMeshLinks = [];
        nodes.forEach((a, aIdx) => {
            nodes.filter((_, bIdx) => bIdx > aIdx) // Prevent linking same node pair more than once
                .forEach(b => { fullMeshLinks.push({ source: a, target: b }) });
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

    return force;
}