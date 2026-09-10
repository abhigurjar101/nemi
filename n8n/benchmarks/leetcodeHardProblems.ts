import type { HardestProblem } from './types'

export const LEETCODE_HARD_PROBLEMS: HardestProblem[] = [
  {
    id: 26,
    title: 'Median of Two Sorted Arrays',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'high-thinking',
    description: 'Find median of two sorted arrays in O(log(min(m, n))) logarithmic time.',
    optimalComplexity: { time: 'O(log(min(M, N)))', space: 'O(1)' },
    canonicalSolution: `def find_median_sorted_arrays(nums1: list[int], nums2: list[int]) -> float:
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1
    m, n = len(nums1), len(nums2)
    low, high = 0, m

    while low <= high:
        i = (low + high) // 2
        j = (m + n + 1) // 2 - i
        max_left_a = nums1[i - 1] if i > 0 else -float('inf')
        min_right_a = nums1[i] if i < m else float('inf')
        max_left_b = nums2[j - 1] if j > 0 else -float('inf')
        min_right_b = nums2[j] if j < n else float('inf')

        if max_left_a <= min_right_b and max_left_b <= min_right_a:
            if (m + n) % 2 == 1:
                return float(max(max_left_a, max_left_b))
            return (max(max_left_a, max_left_b) + min(min_right_a, min_right_b)) / 2.0
        elif max_left_a > min_right_b:
            high = i - 1
        else:
            low = i + 1
    return 0.0`,
    verificationAssertion: 'assert find_median_sorted_arrays([1, 3], [2]) == 2.0 and find_median_sorted_arrays([1, 2], [3, 4]) == 2.5',
  },
  {
    id: 27,
    title: "Regular Expression Matching ('.' and '*')",
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Match full string against regular expression pattern with single character wildcard and zero-or-more quantifier.',
    optimalComplexity: { time: 'O(S * P)', space: 'O(P)' },
    canonicalSolution: `def is_match_regex(s: str, p: str) -> bool:
    dp = [False] * (len(p) + 1)
    dp[0] = True
    for j in range(2, len(p) + 1):
        if p[j - 1] == '*':
            dp[j] = dp[j - 2]

    for i in range(1, len(s) + 1):
        new_dp = [False] * (len(p) + 1)
        for j in range(1, len(p) + 1):
            if p[j - 1] == '*':
                new_dp[j] = new_dp[j - 2]
                if p[j - 2] == '.' or p[j - 2] == s[i - 1]:
                    new_dp[j] = new_dp[j] or dp[j]
            elif p[j - 1] == '.' or p[j - 1] == s[i - 1]:
                new_dp[j] = dp[j - 1]
        dp = new_dp
    return dp[len(p)]`,
    verificationAssertion: 'assert is_match_regex("aa", "a*") and not is_match_regex("mississippi", "mis*is*p*.")',
  },
  {
    id: 28,
    title: 'Merge k Sorted Linked Lists',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Merge K sorted lists into one sorted linked list with total N elements in O(N log K).',
    optimalComplexity: { time: 'O(N log K)', space: 'O(K)' },
    canonicalSolution: `import heapq

class ListNode:
    def __init__(self, val: int = 0, next: 'ListNode | None' = None):
        self.val = val
        self.next = next

def merge_k_lists(lists: list[ListNode | None]) -> ListNode | None:
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))

    dummy = ListNode(0)
    curr = dummy
    while heap:
        val, i, node = heapq.heappop(heap)
        curr.next = node
        curr = curr.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next`,
    verificationAssertion: 'n1 = ListNode(1, ListNode(4, ListNode(5))); n2 = ListNode(1, ListNode(3, ListNode(4))); res = merge_k_lists([n1, n2]); vals = []\nwhile res: vals.append(res.val); res = res.next\nassert vals == [1, 1, 3, 4, 4, 5]',
  },
  {
    id: 29,
    title: 'Reverse Nodes in k-Group',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Reverse nodes of a linked list k at a time with O(1) extra memory.',
    optimalComplexity: { time: 'O(N)', space: 'O(1)' },
    canonicalSolution: `def reverse_k_group(head: ListNode | None, k: int) -> ListNode | None:
    count, node = 0, head
    while node and count < k:
        node = node.next
        count += 1
    if count < k:
        return head
    prev, curr = None, head
    for _ in range(k):
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    head.next = reverse_k_group(curr, k)
    return prev`,
    verificationAssertion: 'lst = ListNode(1, ListNode(2, ListNode(3, ListNode(4, ListNode(5))))); r = reverse_k_group(lst, 2); out = []\nwhile r: out.append(r.val); r = r.next\nassert out == [2, 1, 4, 3, 5]',
  },
  {
    id: 30,
    title: 'Longest Valid Parentheses',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Find length of longest valid parenthesis substring in O(N) time and O(1) space.',
    optimalComplexity: { time: 'O(N)', space: 'O(1)' },
    canonicalSolution: `def longest_valid_parentheses(s: str) -> int:
    left, right, max_len = 0, 0, 0
    for ch in s:
        if ch == '(':
            left += 1
        else:
            right += 1
        if left == right:
            max_len = max(max_len, 2 * right)
        elif right > left:
            left = right = 0
    left = right = 0
    for ch in reversed(s):
        if ch == '(':
            left += 1
        else:
            right += 1
        if left == right:
            max_len = max(max_len, 2 * left)
        elif left > right:
            left = right = 0
    return max_len`,
    verificationAssertion: 'assert longest_valid_parentheses(")()())") == 4 and longest_valid_parentheses("(()") == 2',
  },
  {
    id: 31,
    title: 'Trapping Rain Water (Two-Pointer Optimal)',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Compute trapped rainwater elevation profile in O(N) time and O(1) auxiliary space.',
    optimalComplexity: { time: 'O(N)', space: 'O(1)' },
    canonicalSolution: `def trap_rain_water(height: list[int]) -> int:
    if not height:
        return 0
    l, r = 0, len(height) - 1
    left_max, right_max = height[l], height[r]
    water = 0
    while l < r:
        if left_max < right_max:
            l += 1
            left_max = max(left_max, height[l])
            water += left_max - height[l]
        else:
            r -= 1
            right_max = max(right_max, height[r])
            water += right_max - height[r]
    return water`,
    verificationAssertion: 'assert trap_rain_water([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]) == 6',
  },
  {
    id: 32,
    title: 'Edit Distance (Levenshtein Distance)',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Minimum insertions, deletions, or substitutions to transform word1 to word2 with O(min(m, n)) space.',
    optimalComplexity: { time: 'O(M * N)', space: 'O(min(M, N))' },
    canonicalSolution: `def min_distance(word1: str, word2: str) -> int:
    if len(word1) < len(word2):
        word1, word2 = word2, word1
    m, n = len(word1), len(word2)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        new_dp = [i] + [0] * n
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                new_dp[j] = dp[j - 1]
            else:
                new_dp[j] = 1 + min(dp[j], new_dp[j - 1], dp[j - 1])
        dp = new_dp
    return dp[n]`,
    verificationAssertion: 'assert min_distance("horse", "ros") == 3 and min_distance("intention", "execution") == 5',
  },
  {
    id: 33,
    title: 'Minimum Window Substring',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Find minimum length window in s containing every character from t in O(S + T).',
    optimalComplexity: { time: 'O(S + T)', space: 'O(Sigma)' },
    canonicalSolution: `from collections import Counter

def min_window(s: str, t: str) -> str:
    if not s or not t:
        return ""
    need = Counter(t)
    required = len(need)
    window = {}
    formed = 0
    l = 0
    ans = (float('inf'), 0, 0)
    for r, ch in enumerate(s):
        window[ch] = window.get(ch, 0) + 1
        if ch in need and window[ch] == need[ch]:
            formed += 1
        while l <= r and formed == required:
            if r - l + 1 < ans[0]:
                ans = (r - l + 1, l, r)
            window[s[l]] -= 1
            if s[l] in need and window[s[l]] < need[s[l]]:
                formed -= 1
            l += 1
    return "" if ans[0] == float('inf') else s[ans[1]: ans[2] + 1]`,
    verificationAssertion: 'assert min_window("ADOBECODEBANC", "ABC") == "BANC"',
  },
  {
    id: 34,
    title: 'Largest Rectangle in Histogram',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Compute largest rectangular area in histogram in strict linear O(N) time with monotonic stack.',
    optimalComplexity: { time: 'O(N)', space: 'O(N)' },
    canonicalSolution: `def largest_rectangle_area(heights: list[int]) -> int:
    stack = [-1]
    max_area = 0
    heights.append(0)
    for i, h in enumerate(heights):
        while stack[-1] != -1 and heights[stack[-1]] >= h:
            height = heights[stack.pop()]
            width = i - stack[-1] - 1
            max_area = max(max_area, height * width)
        stack.append(i)
    heights.pop()
    return max_area`,
    verificationAssertion: 'assert largest_rectangle_area([2, 1, 5, 6, 2, 3]) == 10',
  },
  {
    id: 35,
    title: 'Maximal Rectangle in 2D Binary Matrix',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Find largest rectangle containing only 1s in a 2D binary matrix in O(R * C) time.',
    optimalComplexity: { time: 'O(R * C)', space: 'O(C)' },
    canonicalSolution: `def maximal_rectangle(matrix: list[list[str]]) -> int:
    if not matrix or not matrix[0]:
        return 0
    cols = len(matrix[0])
    heights = [0] * (cols + 1)
    max_area = 0
    for row in matrix:
        for j in range(cols):
            heights[j] = heights[j] + 1 if row[j] == '1' else 0
        stack = [-1]
        for j in range(cols + 1):
            while stack[-1] != -1 and heights[stack[-1]] >= heights[j]:
                h = heights[stack.pop()]
                w = j - stack[-1] - 1
                max_area = max(max_area, h * w)
            stack.append(j)
    return max_area`,
    verificationAssertion: 'm = [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]; assert maximal_rectangle(m) == 6',
  },
  {
    id: 36,
    title: 'Binary Tree Maximum Path Sum',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Find maximum path sum between any two nodes in a binary tree in linear O(N) time.',
    optimalComplexity: { time: 'O(N)', space: 'O(H)' },
    canonicalSolution: `class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

def max_path_sum(root: TreeNode | None) -> int:
    max_sum = -float('inf')

    def postorder(node: TreeNode | None) -> int:
        nonlocal max_sum
        if not node:
            return 0
        left_gain = max(0, postorder(node.left))
        right_gain = max(0, postorder(node.right))
        path_sum = node.val + left_gain + right_gain
        max_sum = max(max_sum, path_sum)
        return node.val + max(left_gain, right_gain)

    postorder(root)
    return max_sum`,
    verificationAssertion: 't = TreeNode(-10, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7))); assert max_path_sum(t) == 42',
  },
  {
    id: 37,
    title: 'Word Search II (Trie Prefix Pruning)',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Find all dictionary words on a 2D letter board using Trie prefix pruning and backtracking.',
    optimalComplexity: { time: 'O(M * (4 * 3^(L-1)))', space: 'O(sum|words|)' },
    canonicalSolution: `def find_words(board: list[list[str]], words: list[str]) -> list[str]:
    trie = {}
    for word in words:
        node = trie
        for ch in word:
            node = node.setdefault(ch, {})
        node['$'] = word

    rows, cols = len(board), len(board[0])
    result = []

    def backtrack(r: int, c: int, parent: dict):
        letter = board[r][c]
        curr_node = parent[letter]
        matched_word = curr_node.pop('$', None)
        if matched_word:
            result.append(matched_word)
        board[r][c] = '#'
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] in curr_node:
                backtrack(nr, nc, curr_node)
        board[r][c] = letter
        if not curr_node:
            parent.pop(letter)

    for r in range(rows):
        for c in range(cols):
            if board[r][c] in trie:
                backtrack(r, c, trie)
    return result`,
    verificationAssertion: 'b = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]]; assert sorted(find_words(b, ["oath","pea","eat","rain"])) == ["eat", "oath"]',
  },
  {
    id: 38,
    title: 'The Skyline Problem',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Compute outer skyline contours of buildings using event sweep-line and max-heap in O(N log N).',
    optimalComplexity: { time: 'O(N log N)', space: 'O(N)' },
    canonicalSolution: `import heapq

def get_skyline(buildings: list[list[int]]) -> list[list[int]]:
    events = []
    for l, r, h in buildings:
        events.append((l, -h, r))
        events.append((r, 0, 0))
    events.sort()

    res = [[0, 0]]
    live = [(0, float('inf'))]
    for x, neg_h, r in events:
        while live[0][1] <= x:
            heapq.heappop(live)
        if neg_h != 0:
            heapq.heappush(live, (neg_h, r))
        max_h = -live[0][0]
        if res[-1][1] != max_h:
            res.append([x, max_h])
    return res[1:]`,
    verificationAssertion: 'b = [[2,9,10],[3,7,15],[5,12,12],[15,20,10],[19,24,8]]; assert get_skyline(b)[0] == [2, 10]',
  },
  {
    id: 39,
    title: 'Basic Calculator III (Full Arithmetic & Parentheses)',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Evaluate string mathematical expression containing +, -, *, /, parentheses, and negative numbers.',
    optimalComplexity: { time: 'O(N)', space: 'O(N)' },
    canonicalSolution: `from collections import deque

def calculate(s: str) -> int:
    tokens = deque(s.replace(' ', ''))

    def helper() -> int:
        stack = []
        sign = '+'
        num = 0
        while tokens:
            ch = tokens.popleft()
            if ch.isdigit():
                num = num * 10 + int(ch)
            if ch == '(':
                num = helper()
            if not ch.isdigit() or not tokens:
                if sign == '+':
                    stack.append(num)
                elif sign == '-':
                    stack.append(-num)
                elif sign == '*':
                    stack.append(stack.pop() * num)
                elif sign == '/':
                    top = stack.pop()
                    stack.append(int(top / num))
                sign = ch
                num = 0
                if ch == ')':
                    break
        return sum(stack)

    return helper()`,
    verificationAssertion: 'assert calculate("2*(5+5*2)/3+(6/2+8)") == 21',
  },
  {
    id: 40,
    title: 'Find Median from Continuous Data Stream',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Maintain stream median in O(log N) insertion and O(1) retrieval using dual balanced heaps.',
    optimalComplexity: { time: 'O(log N) insert, O(1) query', space: 'O(N)' },
    canonicalSolution: `import heapq

class MedianFinder:
    def __init__(self):
        self.small = []
        self.large = []

    def add_num(self, num: int):
        heapq.heappush(self.small, -num)
        if self.small and self.large and (-self.small[0]) > self.large[0]:
            heapq.heappush(self.large, -heapq.heappop(self.small))
        if len(self.small) > len(self.large) + 1:
            heapq.heappush(self.large, -heapq.heappop(self.small))
        elif len(self.large) > len(self.small):
            heapq.heappush(self.small, -heapq.heappop(self.large))

    def find_median(self) -> float:
        if len(self.small) > len(self.large):
            return float(-self.small[0])
        return (-self.small[0] + self.large[0]) / 2.0`,
    verificationAssertion: 'mf = MedianFinder(); mf.add_num(1); mf.add_num(2); assert mf.find_median() == 1.5; mf.add_num(3); assert mf.find_median() == 2.0',
  },
  {
    id: 41,
    title: 'Serialize and Deserialize Binary Tree',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Losslessly encode and decode binary tree to string in O(N) time with preorder traversal.',
    optimalComplexity: { time: 'O(N)', space: 'O(N)' },
    canonicalSolution: `class Codec:
    def serialize(self, root: TreeNode | None) -> str:
        vals = []
        def preorder(node):
            if not node:
                vals.append('#')
                return
            vals.append(str(node.val))
            preorder(node.left)
            preorder(node.right)
        preorder(root)
        return ','.join(vals)

    def deserialize(self, data: str) -> TreeNode | None:
        tokens = iter(data.split(','))
        def build():
            val = next(tokens)
            if val == '#':
                return None
            node = TreeNode(int(val))
            node.left = build()
            node.right = build()
            return node
        return build()`,
    verificationAssertion: 'codec = Codec(); root = TreeNode(1, TreeNode(2), TreeNode(3, TreeNode(4), TreeNode(5))); data = codec.serialize(root); rec = codec.deserialize(data); assert rec.val == 1 and rec.right.left.val == 4',
  },
  {
    id: 42,
    title: 'Burst Balloons (Interval Dynamic Programming)',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'high-thinking',
    description: 'Find maximum coins collected by bursting balloons in optimal order in O(N^3) interval DP.',
    optimalComplexity: { time: 'O(N^3)', space: 'O(N^2)' },
    canonicalSolution: `def max_coins(nums: list[int]) -> int:
    arr = [1] + [x for x in nums if x > 0] + [1]
    n = len(arr)
    dp = [[0] * n for _ in range(n)]

    for length in range(2, n):
        for left in range(n - length):
            right = left + length
            max_c = 0
            for i in range(left + 1, right):
                c = arr[left] * arr[i] * arr[right] + dp[left][i] + dp[i][right]
                if c > max_c:
                    max_c = c
            dp[left][right] = max_c
    return dp[0][n - 1]`,
    verificationAssertion: 'assert max_coins([3, 1, 5, 8]) == 167',
  },
  {
    id: 43,
    title: 'Count of Smaller Numbers After Self (Fenwick Tree)',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Count elements strictly smaller to the right for each array element in O(N log N).',
    optimalComplexity: { time: 'O(N log N)', space: 'O(N)' },
    canonicalSolution: `def count_smaller(nums: list[int]) -> list[int]:
    ranks = {v: i + 1 for i, v in enumerate(sorted(set(nums)))}
    tree = [0] * (len(ranks) + 1)

    def add(idx: int):
        while idx < len(tree):
            tree[idx] += 1
            idx += idx & (-idx)

    def query(idx: int) -> int:
        s = 0
        while idx > 0:
            s += tree[idx]
            idx -= idx & (-idx)
        return s

    res = []
    for x in reversed(nums):
        r = ranks[x]
        res.append(query(r - 1))
        add(r)
    return res[::-1]`,
    verificationAssertion: 'assert count_smaller([5, 2, 6, 1]) == [2, 1, 1, 0]',
  },
  {
    id: 44,
    title: 'Longest Increasing Path in a Matrix (Memoized DAG DFS)',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Find length of longest strictly increasing path in a matrix in O(R * C) time.',
    optimalComplexity: { time: 'O(R * C)', space: 'O(R * C)' },
    canonicalSolution: `def longest_increasing_path(matrix: list[list[int]]) -> int:
    if not matrix:
        return 0
    m, n = len(matrix), len(matrix[0])
    memo = [[0] * n for _ in range(m)]

    def dfs(r: int, c: int) -> int:
        if memo[r][c]:
            return memo[r][c]
        res = 1
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and matrix[nr][nc] > matrix[r][c]:
                res = max(res, 1 + dfs(nr, nc))
        memo[r][c] = res
        return res

    return max(dfs(r, c) for r in range(m) for c in range(n))`,
    verificationAssertion: 'm = [[9,9,4],[6,6,8],[2,1,1]]; assert longest_increasing_path(m) == 4',
  },
  {
    id: 45,
    title: 'Trapping Rain Water II (3D Priority Queue)',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'high-thinking',
    description: 'Calculate 3D volume of water trapped in a 2D elevation grid using min-heap boundary shrinkage.',
    optimalComplexity: { time: 'O(MN log(MN))', space: 'O(MN)' },
    canonicalSolution: `import heapq

def trap_rain_water_2d(height_map: list[list[int]]) -> int:
    if not height_map or not height_map[0]:
        return 0
    m, n = len(height_map), len(height_map[0])
    visited = [[False] * n for _ in range(m)]
    heap = []
    for r in range(m):
        for c in range(n):
            if r in (0, m - 1) or c in (0, n - 1):
                heapq.heappush(heap, (height_map[r][c], r, c))
                visited[r][c] = True

    water = 0
    while heap:
        h, r, c = heapq.heappop(heap)
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and not visited[nr][nc]:
                visited[nr][nc] = True
                water += max(0, h - height_map[nr][nc])
                heapq.heappush(heap, (max(h, height_map[nr][nc]), nr, nc))
    return water`,
    verificationAssertion: 'grid = [[1,4,3,1,3,2],[3,2,1,3,2,4],[2,3,3,2,3,1]]; assert trap_rain_water_2d(grid) == 4',
  },
  {
    id: 46,
    title: 'Sliding Window Median (Dual Heaps with Lazy Deletion)',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'high-thinking',
    description: 'Find medians of all sliding windows of size k in O(N log K) time.',
    optimalComplexity: { time: 'O(N log K)', space: 'O(K)' },
    canonicalSolution: `import heapq
from collections import defaultdict

def median_sliding_window(nums: list[int], k: int) -> list[float]:
    small, large = [], []
    delayed = defaultdict(int)
    small_size, large_size = 0, 0

    def prune(heap, is_small):
        while heap:
            x = -heap[0] if is_small else heap[0]
            if delayed[x] > 0:
                delayed[x] -= 1
                heapq.heappop(heap)
            else:
                break

    def balance():
        nonlocal small_size, large_size
        if small_size > large_size + 1:
            heapq.heappush(large, -heapq.heappop(small))
            small_size -= 1
            large_size += 1
            prune(small, True)
        elif small_size < large_size:
            heapq.heappush(small, -heapq.heappop(large))
            large_size -= 1
            small_size += 1
            prune(large, False)

    for i in range(k):
        heapq.heappush(small, -nums[i])
        small_size += 1
    for _ in range(k // 2):
        heapq.heappush(large, -heapq.heappop(small))
        small_size -= 1
        large_size += 1

    medians = []
    for i in range(k, len(nums) + 1):
        if k % 2 == 1:
            medians.append(float(-small[0]))
        else:
            medians.append((-small[0] + large[0]) / 2.0)
        if i == len(nums):
            break
        in_num, out_num = nums[i], nums[i - k]
        delayed[out_num] += 1
        if out_num <= -small[0]:
            small_size -= 1
            if out_num == -small[0]:
                prune(small, True)
        else:
            large_size -= 1
            if large and out_num == large[0]:
                prune(large, False)

        if small and in_num <= -small[0]:
            heapq.heappush(small, -in_num)
            small_size += 1
        else:
            heapq.heappush(large, in_num)
            large_size += 1
        balance()
    return medians`,
    verificationAssertion: 'assert median_sliding_window([1,3,-1,-3,5,3,6,7], 3) == [1.0, -1.0, -1.0, 3.0, 5.0, 6.0]',
  },
  {
    id: 47,
    title: 'Super Egg Drop',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'high-thinking',
    description: 'Minimum moves to find critical floor with k eggs and n floors in O(K log N) time.',
    optimalComplexity: { time: 'O(K log N)', space: 'O(K)' },
    canonicalSolution: `def super_egg_drop(k: int, n: int) -> int:
    dp = [0] * (k + 1)
    moves = 0
    while dp[k] < n:
        moves += 1
        for i in range(k, 0, -1):
            dp[i] = dp[i] + dp[i - 1] + 1
    return moves`,
    verificationAssertion: 'assert super_egg_drop(1, 2) == 2 and super_egg_drop(2, 6) == 3 and super_egg_drop(3, 14) == 4',
  },
  {
    id: 48,
    title: 'Binary Tree Cameras (Greedy Tree Vertex Cover)',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Minimum cameras to monitor all nodes of a binary tree in linear O(N) time.',
    optimalComplexity: { time: 'O(N)', space: 'O(H)' },
    canonicalSolution: `def min_camera_cover(root: TreeNode | None) -> int:
    cameras = 0

    def dfs(node: TreeNode | None) -> int:
        nonlocal cameras
        if not node:
            return 2
        left = dfs(node.left)
        right = dfs(node.right)
        if left == 0 or right == 0:
            cameras += 1
            return 1
        if left == 1 or right == 1:
            return 2
        return 0

    if dfs(root) == 0:
        cameras += 1
    return cameras`,
    verificationAssertion: 't = TreeNode(0, TreeNode(0, TreeNode(0), TreeNode(0))); assert min_camera_cover(t) == 1',
  },
  {
    id: 49,
    title: 'Subarrays with K Different Integers',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Count contiguous subarrays with exactly k distinct elements using at-most differential technique in O(N).',
    optimalComplexity: { time: 'O(N)', space: 'O(N)' },
    canonicalSolution: `from collections import Counter

def subarrays_with_k_distinct(nums: list[int], k: int) -> int:
    def at_most(limit: int) -> int:
        count = Counter()
        ans, l = 0, 0
        for r, x in enumerate(nums):
            count[x] += 1
            while len(count) > limit:
                count[nums[l]] -= 1
                if count[nums[l]] == 0:
                    del count[nums[l]]
                l += 1
            ans += r - l + 1
        return ans
    return at_most(k) - at_most(k - 1)`,
    verificationAssertion: 'assert subarrays_with_k_distinct([1, 2, 1, 2, 3], 2) == 7',
  },
  {
    id: 50,
    title: 'Maximum Profit in Job Scheduling (Weighted Interval Scheduling)',
    category: 'LeetCode Apex Hard',
    difficulty: 'Hard',
    assignedBotId: 'high-thinking',
    description: 'Find max profit of non-overlapping jobs using binary search dynamic programming in O(N log N).',
    optimalComplexity: { time: 'O(N log N)', space: 'O(N)' },
    canonicalSolution: `import bisect

def job_scheduling(start_time: list[int], end_time: list[int], profit: list[int]) -> int:
    jobs = sorted(zip(end_time, start_time, profit))
    dp = [(0, 0)]
    for e, s, p in jobs:
        idx = bisect.bisect_right(dp, (s, float('inf'))) - 1
        total_p = dp[idx][1] + p
        if total_p > dp[-1][1]:
            dp.append((e, total_p))
    return dp[-1][1]`,
    verificationAssertion: 'assert job_scheduling([1,2,3,3], [3,4,5,6], [50,10,40,70]) == 120',
  },
]
