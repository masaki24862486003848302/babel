/* @minVersion 7.21.0 */

import checkInRHS from "checkInRHS";

/**
  Enums are used in this file, but not assigned to vars to avoid non-hoistable values

  CONSTRUCTOR = 0;
  PUBLIC = 1;
  PRIVATE = 2;

  FIELD = 0;
  ACCESSOR = 1;
  METHOD = 2;
  GETTER = 3;
  SETTER = 4;
  CLASS = 5; // only used in assertValidReturnValue

  STATIC = 8;

  DECORATORS_HAVE_THIS = 16;
*/

function createAddInitializerMethod(initializers, decoratorFinishedRef) {
  return function addInitializer(initializer) {
    assertNotFinished(decoratorFinishedRef, "addInitializer");
    assertCallable(initializer, "An initializer");
    initializers.push(initializer);
  };
}

function assertInstanceIfPrivate(has, target) {
  if (!has(target)) {
    throw new TypeError("Attempted to access private element on non-instance");
  }
}

function memberDec(
  dec,
  thisArg,
  name,
  desc,
  initializers,
  kind,
  isStatic,
  isPrivate,
  value,
  hasPrivateBrand,
  metadata
) {
  var kindStr;

  switch (kind) {
    case 1 /* ACCESSOR */:
      kindStr = "accessor";
      break;
    case 2 /* METHOD */:
      kindStr = "method";
      break;
    case 3 /* GETTER */:
      kindStr = "getter";
      break;
    case 4 /* SETTER */:
      kindStr = "setter";
      break;
    default:
      kindStr = "field";
  }

  var ctx = {
    kind: kindStr,
    name: isPrivate ? "#" + name : name,
    static: isStatic,
    private: isPrivate,
    metadata: metadata,
  };

  var decoratorFinishedRef = { v: false };

  if (kind !== 0 /* FIELD */) {
    ctx.addInitializer = createAddInitializerMethod(
      initializers,
      decoratorFinishedRef
    );
  }

  var get, set;
  if (!isPrivate && (kind === 0 /* FIELD */ || kind === 2) /* METHOD */) {
    get = function (target) {
      return target[name];
    };
    if (kind === 0 /* FIELD */) {
      set = function (target, v) {
        target[name] = v;
      };
    }
  } else if (kind === 2 /* METHOD */) {
    // Assert: isPrivate is true.
    get = function (target) {
      assertInstanceIfPrivate(hasPrivateBrand, target);
      return desc.value;
    };
  } else {
    // Assert: If kind === 0, then isPrivate is true.
    var t = kind === 0 /* FIELD */ || kind === 1; /* ACCESSOR */
    if (t || kind === 3 /* GETTER */) {
      if (isPrivate) {
        get = function (target) {
          assertInstanceIfPrivate(hasPrivateBrand, target);
          return desc.get.call(target);
        };
      } else {
        get = function (target) {
          return desc.get.call(target);
        };
      }
    }
    if (t || kind === 4 /* SETTER */) {
      if (isPrivate) {
        set = function (target, value) {
          assertInstanceIfPrivate(hasPrivateBrand, target);
          desc.set.call(target, value);
        };
      } else {
        set = function (target, value) {
          desc.set.call(target, value);
        };
      }
    }
  }
  var has = isPrivate
    ? hasPrivateBrand.bind()
    : function (target) {
        return name in target;
      };
  ctx.access =
    get && set
      ? { get: get, set: set, has: has }
      : get
      ? { get: get, has: has }
      : { set: set, has: has };

  try {
    return dec.call(thisArg, value, ctx);
  } finally {
    decoratorFinishedRef.v = true;
  }
}

function assertNotFinished(decoratorFinishedRef, fnName) {
  if (decoratorFinishedRef.v) {
    throw new Error(
      "attempted to call " + fnName + " after decoration was finished"
    );
  }
}

function assertCallable(fn, hint) {
  if (typeof fn !== "function") {
    throw new TypeError(hint + " must be a function");
  }
}

function assertValidReturnValue(kind, value) {
  var type = typeof value;

  if (kind === 1 /* ACCESSOR */) {
    if (type !== "object" || value === null) {
      throw new TypeError(
        "accessor decorators must return an object with get, set, or init properties or void 0"
      );
    }
    if (value.get !== undefined) {
      assertCallable(value.get, "accessor.get");
    }
    if (value.set !== undefined) {
      assertCallable(value.set, "accessor.set");
    }
    if (value.init !== undefined) {
      assertCallable(value.init, "accessor.init");
    }
  } else if (type !== "function") {
    var hint;
    if (kind === 0 /* FIELD */) {
      hint = "field";
    } else if (kind === 5 /* CLASS */) {
      hint = "class";
    } else {
      hint = "method";
    }
    throw new TypeError(hint + " decorators must return a function or void 0");
  }
}

function curryThis1(fn) {
  return function () {
    return fn(this);
  };
}
function curryThis2(fn) {
  return function (value) {
    fn(this, value);
  };
}

function applyMemberDec(
  ret,
  base,
  decInfo,
  decoratorsHaveThis,
  name,
  kind,
  isStatic,
  isPrivate,
  initializers,
  hasPrivateBrand,
  metadata
) {
  var decs = decInfo[0];

  if (!decoratorsHaveThis && !Array.isArray(decs)) {
    decs = [decs];
  }

  var desc, init, value;

  if (isPrivate) {
    if (kind === 0 /* FIELD */ || kind === 1 /* ACCESSOR */) {
      desc = {
        get: curryThis1(decInfo[3]),
        set: curryThis2(decInfo[4]),
      };
    } else {
      if (kind === 3 /* GETTER */) {
        desc = {
          get: decInfo[3],
        };
      } else if (kind === 4 /* SETTER */) {
        desc = {
          set: decInfo[3],
        };
      } else {
        desc = {
          value: decInfo[3],
        };
      }
    }
  } else if (kind !== 0 /* FIELD */) {
    desc = Object.getOwnPropertyDescriptor(base, name);
  }

  if (kind === 1 /* ACCESSOR */) {
    value = {
      get: desc.get,
      set: desc.set,
    };
  } else if (kind === 2 /* METHOD */) {
    value = desc.value;
  } else if (kind === 3 /* GETTER */) {
    value = desc.get;
  } else if (kind === 4 /* SETTER */) {
    value = desc.set;
  }

  var newValue, get, set;

  var inc = decoratorsHaveThis ? 2 : 1;

  for (var i = decs.length - 1; i >= 0; i -= inc) {
    var dec = decs[i];

    newValue = memberDec(
      dec,
      decoratorsHaveThis ? decs[i - 1] : undefined,
      name,
      desc,
      initializers,
      kind,
      isStatic,
      isPrivate,
      value,
      hasPrivateBrand,
      metadata
    );

    if (newValue !== void 0) {
      assertValidReturnValue(kind, newValue);
      var newInit;

      if (kind === 0 /* FIELD */) {
        newInit = newValue;
      } else if (kind === 1 /* ACCESSOR */) {
        newInit = newValue.init;
        get = newValue.get || value.get;
        set = newValue.set || value.set;

        value = { get: get, set: set };
      } else {
        value = newValue;
      }

      if (newInit !== void 0) {
        if (init === void 0) {
          init = newInit;
        } else if (typeof init === "function") {
          init = [init, newInit];
        } else {
          init.push(newInit);
        }
      }
    }
  }

  if (kind === 0 /* FIELD */ || kind === 1 /* ACCESSOR */) {
    if (init === void 0) {
      // If the initializer was void 0, sub in a dummy initializer
      init = function (instance, init) {
        return init;
      };
    } else if (typeof init !== "function") {
      var ownInitializers = init;

      init = function (instance, init) {
        var value = init;

        for (var i = ownInitializers.length - 1; i >= 0; i--) {
          value = ownInitializers[i].call(instance, value);
        }

        return value;
      };
    } else {
      var originalInitializer = init;

      init = function (instance, init) {
        return originalInitializer.call(instance, init);
      };
    }

    ret.push(init);
  }

  if (kind !== 0 /* FIELD */) {
    if (kind === 1 /* ACCESSOR */) {
      desc.get = value.get;
      desc.set = value.set;
    } else if (kind === 2 /* METHOD */) {
      desc.value = value;
    } else if (kind === 3 /* GETTER */) {
      desc.get = value;
    } else if (kind === 4 /* SETTER */) {
      desc.set = value;
    }

    if (isPrivate) {
      if (kind === 1 /* ACCESSOR */) {
        ret.push(function (instance, args) {
          return value.get.call(instance, args);
        });
        ret.push(function (instance, args) {
          return value.set.call(instance, args);
        });
      } else if (kind === 2 /* METHOD */) {
        ret.push(value);
      } else {
        ret.push(function (instance, args) {
          return value.call(instance, args);
        });
      }
    } else {
      Object.defineProperty(base, name, desc);
    }
  }
}

function applyMemberDecs(Class, decInfos, instanceBrand, metadata) {
  var ret = [];
  var protoInitializers;
  var staticInitializers;
  var staticBrand;

  var existingProtoNonFields = new Map();
  var existingStaticNonFields = new Map();

  for (var i = 0; i < decInfos.length; i++) {
    var decInfo = decInfos[i];

    // skip computed property names
    if (!Array.isArray(decInfo)) continue;

    var kind = decInfo[1];
    var name = decInfo[2];
    var isPrivate = decInfo.length > 3;

    var decoratorsHaveThis = kind & 16; /* DECORATORS_HAVE_THIS */
    var isStatic = !!(kind & 8); /* STATIC */
    var base;
    var initializers;
    var hasPrivateBrand = instanceBrand;

    kind &= 7 /* 0b111 */;

    if (isStatic) {
      base = Class;
      // initialize staticInitializers when we see a non-field static member
      if (kind !== 0 /* FIELD */) {
        staticInitializers = staticInitializers || [];
        initializers = staticInitializers;
      }
      if (isPrivate && !staticBrand) {
        staticBrand = function (_) {
          return checkInRHS(_) === Class;
        };
      }
      hasPrivateBrand = staticBrand;
    } else {
      base = Class.prototype;
      // initialize protoInitializers when we see a non-field member
      if (kind !== 0 /* FIELD */) {
        protoInitializers = protoInitializers || [];
        initializers = protoInitializers;
      }
    }

    if (kind !== 0 /* FIELD */ && !isPrivate) {
      var existingNonFields = isStatic
        ? existingStaticNonFields
        : existingProtoNonFields;

      var existingKind = existingNonFields.get(name) || 0;

      if (
        existingKind === true ||
        (existingKind === 3 /* GETTER */ && kind !== 4) /* SETTER */ ||
        (existingKind === 4 /* SETTER */ && kind !== 3) /* GETTER */
      ) {
        throw new Error(
          "Attempted to decorate a public method/accessor that has the same name as a previously decorated public method/accessor. This is not currently supported by the decorators plugin. Property name was: " +
            name
        );
      }
      existingNonFields.set(
        name,
        !existingKind && kind > 2 /* METHOD */ ? kind : true
      );
    }

    applyMemberDec(
      ret,
      base,
      decInfo,
      decoratorsHaveThis,
      name,
      kind,
      isStatic,
      isPrivate,
      initializers,
      hasPrivateBrand,
      metadata
    );
  }

  pushInitializers(ret, protoInitializers);
  pushInitializers(ret, staticInitializers);
  return ret;
}

function pushInitializers(ret, initializers) {
  if (initializers) {
    ret.push(function (instance) {
      for (var i = 0; i < initializers.length; i++) {
        initializers[i].call(instance);
      }
      return instance;
    });
  }
}

function applyClassDecs(targetClass, classDecs, decoratorsHaveThis, metadata) {
  if (classDecs.length) {
    var initializers = [];
    var newClass = targetClass;
    var name = targetClass.name;

    var inc = decoratorsHaveThis ? 2 : 1;

    for (var i = classDecs.length - 1; i >= 0; i -= inc) {
      var decoratorFinishedRef = { v: false };

      try {
        var nextNewClass = classDecs[i].call(
          decoratorsHaveThis ? classDecs[i - 1] : undefined,
          newClass,
          {
            kind: "class",
            name: name,
            addInitializer: createAddInitializerMethod(
              initializers,
              decoratorFinishedRef
            ),
            metadata,
          }
        );
      } finally {
        decoratorFinishedRef.v = true;
      }

      if (nextNewClass !== undefined) {
        assertValidReturnValue(5 /* CLASS */, nextNewClass);
        newClass = nextNewClass;
      }
    }

    return [
      defineMetadata(newClass, metadata),
      function () {
        for (var i = 0; i < initializers.length; i++) {
          initializers[i].call(newClass);
        }
      },
    ];
  }
  // The transformer will not emit assignment when there are no class decorators,
  // so we don't have to return an empty array here.
}

function defineMetadata(Class, metadata) {
  return Object.defineProperty(
    Class,
    Symbol.metadata || Symbol.for("Symbol.metadata"),
    { configurable: true, enumerable: true, value: metadata }
  );
}

/**
  Basic usage:

  applyDecs(
    Class,
    [
      // member decorators
      [
        decs,               // dec, or array of decs, or array of this values and decs
        0,                  // kind of value being decorated
        'prop',             // name of public prop on class containing the value being decorated,
        '#p',               // the name of the private property (if is private, void 0 otherwise),
      ]
    ],
    [
      // class decorators
      dec1, dec2
    ]
  )
  ```

  Fully transpiled example:

  ```js
  @dec
  class Class {
    @dec
    a = 123;

    @dec
    #a = 123;

    @dec
    @dec2
    accessor b = 123;

    @dec
    accessor #b = 123;

    @dec
    c() { console.log('c'); }

    @dec
    #c() { console.log('privC'); }

    @dec
    get d() { console.log('d'); }

    @dec
    get #d() { console.log('privD'); }

    @dec
    set e(v) { console.log('e'); }

    @dec
    set #e(v) { console.log('privE'); }
  }


  // becomes
  let initializeInstance;
  let initializeClass;

  let initA;
  let initPrivA;

  let initB;
  let initPrivB, getPrivB, setPrivB;

  let privC;
  let privD;
  let privE;

  let Class;
  class _Class {
    static {
      let ret = applyDecs(
        this,
        [
          [dec, 0, 'a'],
          [dec, 0, 'a', (i) => i.#a, (i, v) => i.#a = v],
          [[dec, dec2], 1, 'b'],
          [dec, 1, 'b', (i) => i.#privBData, (i, v) => i.#privBData = v],
          [dec, 2, 'c'],
          [dec, 2, 'c', () => console.log('privC')],
          [dec, 3, 'd'],
          [dec, 3, 'd', () => console.log('privD')],
          [dec, 4, 'e'],
          [dec, 4, 'e', () => console.log('privE')],
        ],
        [
          dec
        ]
      );

      initA = ret[0];

      initPrivA = ret[1];

      initB = ret[2];

      initPrivB = ret[3];
      getPrivB = ret[4];
      setPrivB = ret[5];

      privC = ret[6];

      privD = ret[7];

      privE = ret[8];

      initializeInstance = ret[9];

      Class = ret[10]

      initializeClass = ret[11];
    }

    a = (initializeInstance(this), initA(this, 123));

    #a = initPrivA(this, 123);

    #bData = initB(this, 123);
    get b() { return this.#bData }
    set b(v) { this.#bData = v }

    #privBData = initPrivB(this, 123);
    get #b() { return getPrivB(this); }
    set #b(v) { setPrivB(this, v); }

    c() { console.log('c'); }

    #c(...args) { return privC(this, ...args) }

    get d() { console.log('d'); }

    get #d() { return privD(this); }

    set e(v) { console.log('e'); }

    set #e(v) { privE(this, v); }
  }

  initializeClass(Class);
 */

export default function applyDecs2305(
  targetClass,
  memberDecs,
  classDecs,
  classDecsHaveThis,
  instanceBrand,
  parentClass
) {
  if (arguments.length >= 6) {
    var parentMetadata =
      parentClass[Symbol.metadata || Symbol.for("Symbol.metadata")];
  }
  var metadata = Object.create(
    parentMetadata === void 0 ? null : parentMetadata
  );
  var e = applyMemberDecs(targetClass, memberDecs, instanceBrand, metadata);
  if (!classDecs.length) defineMetadata(targetClass, metadata);
  return {
    e: e,
    // Lazily apply class decorations so that member init locals can be properly bound.
    get c() {
      return applyClassDecs(
        targetClass,
        classDecs,
        classDecsHaveThis,
        metadata
      );
    },
  };
}
