import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeMenu, analyzeDietary } from '../lib/audit/menu-dietary'

test('structured/HTML menu with prices → html format', () => {
  const html = '<div>Pasta €14,50</div><div>Pizza €12,00</div><div>Risotto €16,50</div><div>Tiramisu €7,50</div>'
  assert.equal(analyzeMenu(html).format, 'html')
})

test('PDF menu link → pdf format', () => {
  const html = '<a href="/downloads/menukaart.pdf">Our menu</a>'
  assert.equal(analyzeMenu(html).format, 'pdf')
})

test('image menu → image format', () => {
  const html = '<img src="/img/menukaart.jpg" alt="menu" />'
  assert.equal(analyzeMenu(html).format, 'image')
})

test('no menu reference → none', () => {
  assert.equal(analyzeMenu('<p>Welcome to our restaurant</p>').format, 'none')
})

test('richness: descriptive menu reads strong, terse reads weak', () => {
  const rich = '<div>Huisgemaakte truffelpasta met pecorino, vers geserveerd €18,50</div><div>Gegrilde zalm, gerookte saus €22,00</div><div>Biologisch seizoensgroenten €9,00</div><div>Gemarineerde kip €15,00</div>'
  assert.equal(analyzeMenu(rich).richness, 'strong')
  const terse = '<div>Pasta €14,00</div><div>Pizza €12,00</div><div>Salad €9,00</div><div>Soup €6,00</div>'
  assert.equal(analyzeMenu(terse).richness, 'weak')
})

test('dietary detection picks up the diets present', () => {
  const html = '<p>We offer vegan and glutenvrij options. Halal meat. Allergenen op aanvraag.</p>'
  const d = analyzeDietary(html).detected
  assert.ok(d.includes('Vegan'))
  assert.ok(d.includes('Gluten-free'))
  assert.ok(d.includes('Halal'))
  assert.ok(d.includes('Allergen info'))
  assert.ok(!d.includes('Vegetarian'))
})

test('no dietary mentions → empty', () => {
  assert.deepEqual(analyzeDietary('<p>Great food</p>').detected, [])
})
