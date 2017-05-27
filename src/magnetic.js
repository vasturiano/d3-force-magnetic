import constant from './constant';

export default function() {
    let nodes = [],
        links = [],
        id = (node => node.index),              // accessor: node unique id
        charge = (node => 1),                   // accessor: number (equivalent to node mass)
        strength = (link => 1);                 // accessor: 0 <= number <= 1 (equivalent to G constant)

    function force(alpha) {
        links.forEach(link => {
            const d = cart2Polar(link.target.x-link.source.x, link.target.y-link.source.y);
            if (d.d === 0) return;

            // Intensity falls quadratically with distance
            const relStrength = alpha * strength(link) / (d.d*d.d);
            const sourceAcceleration = polar2Cart(charge(link.target) * relStrength, d.a);
            const targetAcceleration = polar2Cart(charge(link.source) * relStrength, d.a + Math.PI);

            [[link.source, sourceAcceleration], [link.target, targetAcceleration]].forEach(([node, acceleration]) => {
                node.vx += acceleration.x;
                node.vy += acceleration.y;
            });
        });

        //

        function cart2Polar(x, y) {
            x = x||0; // Normalize -0 to 0 to avoid -Infinity issues in atan
            return {
                d: Math.sqrt(x*x + y*y),
                a: (x === 0 && y === 0) ? 0 : Math.atan(y/x) + (x<0 ? Math.PI : 0) // Add PI for coords in 2nd & 3rd quadrants
            }
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