import type { SceneBlob, BlobParams } from './engine.js';

/**
 * The supplied campaign scene, copied verbatim from
 * assets/animation/blobs-background.html (blobs-20261109-234320.json:
 * 1920 x 1080 board, 30 s seamless loop).
 */
export const ORIGINAL_SCENE: {
	version: number;
	board: { w: number; h: number };
	background: string;
	transparent: boolean;
	loop: number;
	params: BlobParams;
	blobs: SceneBlob[];
} = {"version":1,"board":{"w":1920,"h":1080},"background":"#c5d92f","transparent":false,"loop":30,"params":{"reach":2.8,"thickness":0.25,"flare":0.36,"smooth":0.5,"snap":0.95,"taper":3.25,"organic":1,"maxBridges":3,"noOverlap":true},"blobs":[{"id":1,"x":48.67,"y":42.74,"r":128,"color":"#111111","motion":{"type":"drift","amp":485,"cycles":1,"phase":0,"angle":0,"pulse":0.25}},{"id":2,"x":517.27,"y":245.85,"r":128,"color":"#111111","motion":{"type":"drift","amp":485,"cycles":1,"phase":0,"angle":0,"pulse":0.25}},{"id":3,"x":143.31,"y":605.57,"r":128,"color":"#111111","motion":{"type":"drift","amp":485,"cycles":1,"phase":0,"angle":0,"pulse":0.25}},{"id":5,"x":1032.6,"y":132.41,"r":128,"color":"#111111","motion":{"type":"drift","amp":485,"cycles":1,"phase":0,"angle":0,"pulse":0.25}},{"id":6,"x":1061.88,"y":1020.1,"r":128,"color":"#111111","motion":{"type":"drift","amp":485,"cycles":1,"phase":0,"angle":0,"pulse":0.25}},{"id":7,"x":778.5,"y":656.39,"r":128,"color":"#111111","motion":{"type":"drift","amp":485,"cycles":1,"phase":0,"angle":0,"pulse":0.25}},{"id":8,"x":1499.45,"y":428.67,"r":128,"color":"#111111","motion":{"type":"drift","amp":485,"cycles":1,"phase":0,"angle":0,"pulse":0.25}},{"id":10,"x":146.76,"y":1089.96,"r":128,"color":"#111111","motion":{"type":"drift","amp":485,"cycles":1,"phase":0,"angle":0,"pulse":0.25}},{"id":11,"x":1659.32,"y":-126.45,"r":128,"color":"#111111","motion":{"type":"drift","amp":485,"cycles":1,"phase":0,"angle":0,"pulse":0.25}},{"id":12,"x":1793.36,"y":969.22,"r":128,"color":"#111111","motion":{"type":"drift","amp":485,"cycles":1,"phase":0,"angle":0,"pulse":0.25}},{"id":13,"x":1917.58,"y":416.45,"r":128,"color":"#111111","motion":{"type":"drift","amp":485,"cycles":1,"phase":0,"angle":0,"pulse":0.25}},{"id":14,"x":548.87,"y":-198.69,"r":128,"color":"#111111","motion":{"type":"drift","amp":485,"cycles":1,"phase":0,"angle":0,"pulse":0.25}}]};
