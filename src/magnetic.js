import constant from './constant';

export default function() {
    let nodes,
        links = [],
        id = (node => node.index),              // accessor: node unique id
        charge = (node => 1),                   // accessor: number
        strength = (link => 1);                 // accessor: 0 <= number <= 1

    function force() {
        links.forEach(link => {
            //
        });
    }

    function initialize() {
        const nodesById = {};
        nodes.forEach(node => {
            nodesById[id(node)] = node;
        });

        links.forEach(link => {
            if (typeof link.source !== "object") link.source = nodesById[link.source];
            if (typeof link.target !== "object") link.target = nodesById[link.target];
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