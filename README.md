# 🎃 Hypermore

Experimental HTML preprocessor and template engine built with [Hyperless](https://github.com/dbushell/hyperless).

## Custom Elements and Components

Custom element templates can be registered to behave like "components" or "includes" when rendered.

For example we can register `my-component`:

```javascript
const hypermore = new Hypermore();
hypermore.setTemplate(
  'my-component',
  '<h1>{{heading}}</h1>'
);
await hypermore.render('<my-component heading="Hello, World!"/>');
```

This will render:

```html
<h1>Hello, World!</h1>
```

If the template `my-component` is not registered any usage will rendered as-is like a standard HTML custom element:

```html
<my-component heading="Hello, World!"/>
```

Template names must match [custom element name](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name) requirements. Also they can not start with an `ssr-` prefix.

* * *

[MIT License](/LICENSE) | Copyright © 2024 [David Bushell](https://dbushell.com)
