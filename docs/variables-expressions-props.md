# Variables, Expressions, and Props

HTML text nodes are parsed for variables, or JavaScript expressions, between `{{` and `}}`. We can print the `heading` variable in uppercase:

```javascript
// "<h1>HELLO, WORLD!</h1>"
await new Hypermore().render(
  '<h1>{{ heading.toUpperCase() }}</h1>',
  { heading: 'Hello, World!' }
);
```

## Local Props

HTML attributes are also parsed and evaluated. Attributes are used as local props for component templates:

```javascript
const hypermore = new Hypermore();
hypermore.setTemplate(
  'my-component',
  '<h1>{{heading}}</h1>'
);
// "<h1>HELLO, WORLD!</h1>"
await hypermore.render(`<my-component heading="{{ 'Hello, World!'.toUpperCase() }}"/>`);
```

Component props passed as attributes are string type by default. Evaluated types are preserved, for example:

```javascript
const hypermore = new Hypermore();
hypermore.setTemplate('my-type', '{{typeof prop}}');
await hypermore.render(`
  <my-type prop="42"/>
  <my-type prop="{{42}}"/>
`);
```

This will output `string` and `number`.

## Global Props

Global props can be configured. They are destructured into every template, unless overwritten by a local prop. They are always available under the `globalProps` object.

```javascript
const hypermore = new Hypermore({
  globalProps: { number: 42 }
});
hypermore.setTemplate('my-component', '{{number}}');
// "42"
await hypermore.render(`<my-component />`);
// "777"
await hypermore.render(`<my-component number="777" />`);
// "42"
await hypermore.render(`<my-component number="{{globalProps.number}}" />`);
```
