# 🎃 Hypermore

Experimental HTML preprocessor and template engine built with [Hyperless](https://github.com/dbushell/hyperless).

## Custom Elements and Components

Custom element templates can be registered to behave like component includes when rendered.

For example we can register `my-component`:

```javascript
const hypermore = new Hypermore();
hypermore.setTemplate(
  'my-component',
  '<h1>{{heading}}</h1>'
);
await hypermore.render('<my-component heading="Hello, World!"/>');
```

This will output:

```html
<h1>Hello, World!</h1>
```

If the template `my-component` is not registered any usage is rendered as-is like a standard custom element:

```html
<my-component heading="Hello, World!"/>
```

Template names must match [custom element name](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name) requirements. Also they can not start with an `ssr-` prefix.

## Variables and Expressions

HTML text nodes are parsed for variables, or JavaScript expressions, between `{{` and `}}`. For example, we can print the `heading` variable in uppercase:

```html
<h1>{{ heading.toUppercase() }}</h1>
```

HTML attributes are also parsed. Using the `my-component` example above we can evaluate a prop value:

```javascript
await hypermore.render(`<my-component heading="{{ 'Hello, World!'.toUpperCase() }}"/>`);
```

This will output:

```html
<h1>HELLO, WORLD!</h1>
```

Attribute props are string type by default. Evaluated types are preserved, for example:

```javascript
hypermore.setTemplate('my-type', '{{typeof prop}}');
await hypermore.render(`
  <my-type prop="42"/>
  <my-type prop="{{42}}"/>
`);
```

This will output `string` and `number`.

* * *

[MIT License](/LICENSE) | Copyright © 2024 [David Bushell](https://dbushell.com)
