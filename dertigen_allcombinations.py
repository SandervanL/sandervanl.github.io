import itertools
from math import factorial
from scipy.stats import binom
from typing import List, Dict, Tuple


def get_probs(dices_left, p, dices_to_get):
	if dices_to_get == 0:
		return (1 - p) ** dices_left

	throw_sum = 0
	for dices_got in range(1, dices_to_get + 1):
		throw_sum += binom.pmf(dices_got, dices_left, p) * get_probs(dices_left - dices_got, p,
																	 dices_to_get - dices_got)
	return throw_sum


# Probabilities of getting 'i' dices right.
probabilities = [get_probs(6, 1/6, i) for i in range(0, 7)]

print("Probability getting 'i' numbers right: " + str([round(p, 3) for p in probabilities]))

# Create initial utilities
utilities_rising = list(range(7))
utilities_diving = list(range(7))

# Whether to keep saving for sixes after getting six sixes
# Else ones will be saved.
six_after_six = False

# No proof yet if utility values will converge. Just run 100 cycles
for t in range(20):
	six_utility_diving = utilities_diving[6]
	six_utility_rising = utilities_rising[6]

	# Calculate utility for saving 6 or 5 or 4 dices, in that order
	for i in range(6):
		# Start at 6, calculate back.
		save_number = 6 - i

		# Initialize first reward
		utilities_diving[save_number] = save_number
		utilities_rising[save_number] = save_number

		# Calculate utility for how many dices obtained of
		for dices_obtained in range(0, 7):
			current_rising_value = save_number * dices_obtained
			current_diving_value = save_number * dices_obtained * 2

			# If all dices are obtained, go to the next round
			if dices_obtained == 6:
				if save_number < 6:
					current_rising_value += utilities_rising[save_number + 1]
					current_diving_value += utilities_diving[save_number + 1]
				else:
					# Save sixes after getting six sixes, or go back to 1
					if six_after_six:
						current_rising_value += six_utility_rising
						current_diving_value += six_utility_diving
					else:
						current_rising_value += utilities_rising[1]
						current_diving_value += utilities_diving[1]

			# U = p * v
			utilities_rising[save_number] += probabilities[dices_obtained] * current_rising_value
			utilities_diving[save_number] += probabilities[dices_obtained] * current_diving_value

print("Utilities for diving: " + str([round(x, 3) for x in utilities_diving]))
print("Utilities for rising: " + str([round(x, 3) for x in utilities_rising]))

spies_cost = -15


class DiceState:
	def __init__(self, dice_sum: int, dices_thrown: int):
		self.dice_sum = dice_sum
		self.dices_thrown = dices_thrown

	def __eq__(self, o: object) -> bool:
		return hasattr(o, 'dice_sum') and self.dice_sum == o.dice_sum and \
			   hasattr(o, 'dices_thrown') and self.dices_thrown == o.dices_thrown

	def __hash__(self) -> int:
		return self.dice_sum << 5 | self.dices_thrown


class DiceThrow:
	def __init__(self, list: List[int]):
		self.list = list

	def __eq__(self, o: object) -> bool:
		return hasattr(o, 'list') and self.list == o.list

	def __hash__(self) -> int:
		hash = 0
		for i in range(len(self.list)):
			hash |= self.list[i] << (i * 5)
		return hash


def get_reward(dice_state: DiceState) -> int:
	if dice_state.dices_thrown < 6:
		return 0

	if dice_state.dice_sum <= 12:
		return utilities_diving[12 - dice_state.dice_sum]
	elif dice_state.dice_sum == 30:
		return -15
	if dice_state.dice_sum > 30:
		return utilities_rising[dice_state.dice_sum - 30]
	return dice_state.dice_sum - 30


def get_from_dict(v: Dict, key: DiceState):
	if key in v:
		return v[key]
	return 0


def store_in_dict(v: Dict, outer_key: DiceState, inner_key: DiceThrow, value):
	if outer_key not in v:
		v[outer_key] = {}

	assert inner_key not in v[outer_key]
	v[outer_key][inner_key] = value


def get_indexed_thrown_state(thrown_state):
	result = [0, 0, 0, 0, 0, 0]
	for dice in thrown_state:
		if dice == 0:
			continue
		result[dice - 1] += 1
	return result


def get_all_thrown_states(depth, current_arr):
	if depth == 0:
		yield DiceThrow(current_arr)
		return
	for i in range(1, 7):
		yield from get_all_thrown_states(depth - 1, [i] + current_arr)


def get_thrown_dice_states() -> Tuple[int, int]:
	"""
	Find all combinations of sum states and dices left.
	"""
	for num_dices_thrown in range(0, 7):
		# The sum of the dices already thrown

		for dice_sum in range(num_dices_thrown, num_dices_thrown * 6 + 1):
			dice_state = DiceState(dice_sum, num_dices_thrown)
			for dice_throw in get_all_thrown_states(6 - num_dices_thrown, []):
				yield dice_state, dice_throw

v_prev = {}
policy = {}

epsilon = 0.000000001
discount = 0.99999999
num_iterations = 10000
for i in range(100):
	v_throws = {}
	policy = {}

	# Do Q-Learning step
	for dice_state, dice_throw in get_thrown_dice_states():
		current_value = get_reward(dice_state)
		best_action = 0

		# Throw the other dices
		if dice_state.dices_thrown < 6:
			counted_dices = get_indexed_thrown_state(dice_throw.list)
			max_value = -999999999999
			max_dice = -1
			for dice_value in range(1, 7):
				dice_count = counted_dices[dice_value - 1]
				if dice_count == 0:
					continue
				new_sum = dice_state.dice_sum + dice_value * dice_count
				num_dices_thrown = dice_state.dices_thrown + dice_count
				reward = get_from_dict(v_prev, DiceState(new_sum, num_dices_thrown))
				if reward > max_value:
					max_value = reward
					best_action = dice_value

			current_value += discount * max_value
			# Compute policy in last iteration
			# store_in_dict(policy, dice_state, dice_throw, best_action)

		# Store the new found reward.
		store_in_dict(v_throws, dice_state, dice_throw, current_value)

	delta = -1
	# Translate v[state][throw] to v[state]
	for dice_state, throw_dict in v_throws.items():
		summed_value = 0
		for dice_throw, value in throw_dict.items():
			summed_value += value
		current_value = summed_value / len(throw_dict)

		delta = max(delta, abs(current_value - get_from_dict(v_prev, dice_state)))
		v_prev[dice_state] = current_value

	print(f"Largest difference in loop {i + 1}: {round(delta, 4)}")
	if delta < epsilon:
		break

with open('dertigen_values_all.csv', 'w') as file:
	file.write('Dice Sum,Dices Thrown,Value\n')
	for dice_state, value in v_prev.items():
		file.write("{},{},{}\n".format(dice_state.dice_sum, dice_state.dices_thrown, round(value, 3)))

# with open('dertigen_policy.csv', 'w') as file:
# 	file.write('Dice Sum,Dices Thrown,Min Value,Min Num,Max Value,Max Num,Action\n')
# 	for dice_state, throw_dict in policy.items():
# 		for dice_throw, value in throw_dict.items():
# 			file.write("{},{},{},{},{},{},{}\n".format(
# 				dice_state.dice_sum,
# 				dice_state.dices_thrown,
# 				dice_throw.min_value,
# 				dice_throw.min_num,
# 				dice_throw.max_value,
# 				dice_throw.max_num,
# 				value
# 			))
