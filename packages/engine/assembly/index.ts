export function applyPressures(mana: i32, unrest: i32, threat: i32): Int32Array {
  const res = new Int32Array(3);
  res[0] = mana > 5 ? mana - 5 : 0;
  res[1] = unrest + 1;
  res[2] = threat + 1;
  return res;
}
