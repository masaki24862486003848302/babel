var _computedKey, _initProto, _class;
const dec = () => {};
_computedKey = 'b';
class Foo {
  constructor(...args) {
    babelHelpers.defineProperty(this, "value", 1);
    _initProto(this);
  }
  a() {
    return this.value;
  }
  [_computedKey]() {
    return this.value;
  }
}
_class = Foo;
[_initProto] = babelHelpers.applyDecs2301(_class, [[dec, 2, "a"], [dec, 2, _computedKey]], []).e;
