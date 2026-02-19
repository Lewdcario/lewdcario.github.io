import { describe, expect, it } from 'vitest';
import projects from '../../data/projects';

describe('Project data', () => {
	it('contains at least one project entry', () => {
		expect(projects.length).toBeGreaterThan(0);
	});
});
