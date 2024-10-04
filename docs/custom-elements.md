# Custom Elements

Custom elements can be registered with a template and then used like **components**, or **includes**, in other frameworks.

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

If the template `my-component` is not registered then any usage is rendered as-is like a standard custom element:

```html
<my-component heading="Hello, World!"/>
```

Template names must match the [custom element name](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name) requirements.

Template names must not start with the `ssr-` prefix.
