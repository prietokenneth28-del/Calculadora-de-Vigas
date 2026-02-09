clear
clc
syms Ra Rb Rd x c1 c2 %Mc w
%syms L 'positive'

w = 50;
L = 3;
Mc = 12;

R = [Ra Rb Rd];
P = 3 * L * w;

ec1 = sum(R) == P;
ec2 = Rb * L + 3 * Rd * L == (P * L * 1.5) + Mc;

% Singularidad:

v = Ra * (x - 0)^0 * heaviside(x - 0) + Rb * (x - L)^0 * heaviside(x - L)  + Rd * (x - 3*L)^0 * heaviside(x - 3*L) ...
    - w * (x - 0)^1 * heaviside(x - 0);

M = Ra * (x - 0)^1 * heaviside(x - 0) + Rb * (x - L)^1 * heaviside(x - L)  + Rd * (x - 3*L)^1 * heaviside(x - 3*L) ...
  - Mc * (x - 2*L)^0 * heaviside(x - 2*L) - (w/2) * (x - 0)^2 * heaviside(x - 0);

y = Ra/6 * (x - 0)^3 * heaviside(x - 0) + Rb/6 * (x - L)^3 * heaviside(x - L)  + Rd/6 * (x - 3*L)^3 * heaviside(x - 3*L) ...
  - Mc/2 * (x - 2*L)^2 * heaviside(x - 2*L) - (w/24) * (x - 0)^4 * heaviside(x - 0) + c1 * x + c2;

eq  = subs(y,x,0);
eq1 = subs(y,x,L);
eq2 = subs(y,x,3*L);

sol = solve([eq==0 eq1==0 eq2==0], [c1 c2 Ra]);


ec3 = sol.Ra == Ra;

solGeneral = solve([ec1 ec2 ec3], [Ra Rb Rd]);

disp("Ra = " + num2str(double(solGeneral.Ra),'%.2f'))
disp("Rb = " + num2str(double(solGeneral.Rb),'%.2f'))
disp("Rd = " + num2str(double(solGeneral.Rd),'%.2f'))


