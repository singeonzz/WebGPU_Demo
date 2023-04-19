"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var circle_1 = __importDefault(require("../classes/geometrical/circle"));
var LAYOUT_MESSAGE = {
    START: 'layoutStart',
    END: 'layoutEnd',
    ERROR: 'layoutError',
};
function handleLayoutMessage(event) {
    var _a = event.data, nodes = _a.nodes, edges = _a.edges, _b = _a.layoutCfg, layoutCfg = _b === void 0 ? {} : _b;
    var layoutType = layoutCfg.type, options = layoutCfg.options, width = layoutCfg.width, height = layoutCfg.height, center = layoutCfg.center, allNodes = layoutCfg.allNodes;
    var data, ids = [], positions = [];
    try {
        switch (layoutType) {
            case 'circular': {
                data = (0, circle_1.default)(nodes, options);
                if (options === null || options === void 0 ? void 0 : options.incremental)
                    for (var i in data) {
                        ids.push(i);
                        positions.push(__assign(__assign({}, data[i]), { id: i }));
                    }
                break;
            }
            default:
                break;
        }
    }
    catch (err) {
        console.error(LAYOUT_MESSAGE.ERROR);
        // @ts-ignore
        postMessage({ type: LAYOUT_MESSAGE.ERROR });
    }
    // @ts-ignore
    postMessage({ type: LAYOUT_MESSAGE.END, data: data, ids: ids, positions: positions });
}
// @ts-ignore
onmessage = function (event) {
    handleLayoutMessage(event);
};
