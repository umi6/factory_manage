declare const itemController: {
  addInput: (...args: any[]) => any;
  addOutputFromName: (...args: any[]) => any;
  addAchievement: (...args: any[]) => any;
  isItemMakeable: (...args: any[]) => any;
  getItemStock: (...args: any[]) => any;
  getBomId: (...args: any[]) => any;
  getRequireItemsFromBomId: (...args: any[]) => any;
  getTypeFromId: (...args: any[]) => any;
  getTypeFromName: (...args: any[]) => any;
  getAllInputHistory: (...args: any[]) => any;
  getAllOutputHistory: (...args: any[]) => any;
};

export default itemController;